import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { beforeEach, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.API_TOKEN = 'test-token';
process.env.WEBHOOK_SECRET = 'test-secret';

const [{ createApp }, { store }] = await Promise.all([
  import('../src/app.js'),
  import('../src/repositories/in-memory-store.js')
]);

const app = createApp();

function withAuth(apiRequest) {
  return apiRequest.set('Authorization', 'Bearer test-token');
}

function signWebhookPayload(payload) {
  return `sha256=${createHmac('sha256', 'test-secret').update(payload).digest('hex')}`;
}

beforeEach(() => {
  store.reset();
});

test('health endpoint is public', async () => {
  const response = await request(app).get('/health').expect(200);

  assert.equal(response.body.data.status, 'ok');
});

test('protected endpoints require authentication', async () => {
  const response = await request(app).get('/api/v1/payments').expect(401);

  assert.equal(response.body.error.code, 'unauthorized');
});

test('creates a fiat deposit with idempotency replay support', async () => {
  const body = {
    type: 'deposit',
    customerId: 'cust_demo',
    asset: 'USD',
    amount: '100.00',
    rail: 'bank_transfer',
    source: { externalReference: 'bank-ref-1' }
  };

  const firstResponse = await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-deposit-1')
    .send(body)
    .expect(201);

  const replayResponse = await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-deposit-1')
    .send(body)
    .expect(200);

  assert.equal(firstResponse.body.data.id, replayResponse.body.data.id);
  assert.equal(replayResponse.body.meta.idempotentReplay, true);
});

test('rejects reused idempotency keys with different request bodies', async () => {
  const baseBody = {
    type: 'deposit',
    customerId: 'cust_demo',
    asset: 'USD',
    amount: '100.00',
    rail: 'bank_transfer'
  };

  await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-conflict-1')
    .send(baseBody)
    .expect(201);

  const response = await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-conflict-1')
    .send({ ...baseBody, amount: '101.00' })
    .expect(409);

  assert.equal(response.body.error.code, 'conflict');
});

test('creates crypto withdrawals and debits available balance', async () => {
  const response = await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-withdrawal-1')
    .send({
      type: 'withdrawal',
      customerId: 'cust_demo',
      asset: 'BTC',
      amount: '0.50000000',
      rail: 'crypto_network',
      destination: {
        walletAddress: 'bc1qexampleaddress000000000000000000000',
        network: 'bitcoin'
      }
    })
    .expect(201);

  assert.equal(response.body.data.status, 'processing');
  assert.equal(response.body.data.totalDebit, '0.50005000');

  const balancesResponse = await withAuth(
    request(app).get('/api/v1/wallets/cust_demo/balances')
  ).expect(200);
  const btcBalance = balancesResponse.body.data.find((balance) => balance.asset === 'BTC');

  assert.equal(btcBalance.available, '0.74995000');
});

test('creates a conversion payment from an accepted quote', async () => {
  const quoteResponse = await withAuth(request(app).post('/api/v1/quotes'))
    .send({
      customerId: 'cust_demo',
      sourceAsset: 'USD',
      targetAsset: 'EUR',
      sourceAmount: '100.00'
    })
    .expect(201);

  const paymentResponse = await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-conversion-1')
    .send({
      type: 'conversion',
      customerId: 'cust_demo',
      sourceAsset: 'USD',
      targetAsset: 'EUR',
      sourceAmount: '100.00',
      quoteId: quoteResponse.body.data.id
    })
    .expect(201);

  assert.equal(paymentResponse.body.data.status, 'completed');
  assert.equal(paymentResponse.body.data.targetAsset, 'EUR');
});

test('rejects a quote consumed by a different customer', async () => {
  const quoteResponse = await withAuth(request(app).post('/api/v1/quotes'))
    .send({
      customerId: 'cust_demo',
      sourceAsset: 'USD',
      targetAsset: 'EUR',
      sourceAmount: '100.00'
    })
    .expect(201);

  const response = await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-conversion-foreign-1')
    .send({
      type: 'conversion',
      customerId: 'cust_other',
      sourceAsset: 'USD',
      targetAsset: 'EUR',
      sourceAmount: '100.00',
      quoteId: quoteResponse.body.data.id
    })
    .expect(403);

  assert.equal(response.body.error.code, 'forbidden');
});

test('signed webhook completes a pending deposit and credits wallet', async () => {
  const paymentResponse = await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-webhook-1')
    .send({
      type: 'deposit',
      customerId: 'cust_demo',
      asset: 'USD',
      amount: '250.00',
      rail: 'bank_transfer'
    })
    .expect(201);

  const webhookBody = JSON.stringify({
    eventId: 'evt-payment-completed-1',
    type: 'payment.completed',
    paymentId: paymentResponse.body.data.id,
    providerReference: 'bank-provider-1'
  });

  await request(app)
    .post('/api/v1/webhooks/providers/bank-partner')
    .set('content-type', 'application/json')
    .set('x-webhook-signature', signWebhookPayload(webhookBody))
    .send(webhookBody)
    .expect(200);

  const balancesResponse = await withAuth(
    request(app).get('/api/v1/wallets/cust_demo/balances')
  ).expect(200);
  const usdBalance = balancesResponse.body.data.find((balance) => balance.asset === 'USD');

  assert.equal(usdBalance.available, '50250.00');
});

test('canceled withdrawals stay terminal and are not double-refunded by a failure webhook', async () => {
  const paymentResponse = await withAuth(request(app).post('/api/v1/payments'))
    .set('Idempotency-Key', 'idem-cancel-terminal-1')
    .send({
      type: 'withdrawal',
      customerId: 'cust_demo',
      asset: 'BTC',
      amount: '0.50000000',
      rail: 'crypto_network',
      destination: {
        walletAddress: 'bc1qexampleaddress000000000000000000000',
        network: 'bitcoin'
      }
    })
    .expect(201);

  const paymentId = paymentResponse.body.data.id;

  await withAuth(request(app).post(`/api/v1/payments/${paymentId}/cancel`)).expect(200);

  const webhookBody = JSON.stringify({
    eventId: 'evt-payment-failed-after-cancel-1',
    type: 'payment.failed',
    paymentId,
    failureReason: 'Provider reported failure.'
  });

  const webhookResponse = await request(app)
    .post('/api/v1/webhooks/providers/crypto-partner')
    .set('content-type', 'application/json')
    .set('x-webhook-signature', signWebhookPayload(webhookBody))
    .send(webhookBody)
    .expect(200);

  assert.equal(webhookResponse.body.data.payment.status, 'canceled');

  const balancesResponse = await withAuth(
    request(app).get('/api/v1/wallets/cust_demo/balances')
  ).expect(200);
  const btcBalance = balancesResponse.body.data.find((balance) => balance.asset === 'BTC');

  assert.equal(btcBalance.available, '1.25000000');
});
