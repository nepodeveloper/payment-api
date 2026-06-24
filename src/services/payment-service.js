import { createHash, randomUUID } from 'node:crypto';
import { getAssetType, RAILS_BY_ASSET_TYPE } from '../constants/currencies.js';
import { store } from '../repositories/in-memory-store.js';
import { ApiError } from '../utils/api-error.js';
import { Decimal, parsePositiveAmount, toAssetAmount } from '../utils/money.js';
import { stableStringify } from '../utils/stable-stringify.js';
import { ratesService } from './rates-service.js';
import { walletService } from './wallet-service.js';

function nowIso() {
  return new Date().toISOString();
}

function hashBody(body) {
  return createHash('sha256').update(stableStringify(body)).digest('hex');
}

function providerReference(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function calculateTransferFee({ amount, asset, rail, type }) {
  const grossAmount = new Decimal(amount);

  if (type === 'deposit' && rail === 'card') {
    return toAssetAmount(grossAmount.mul('0.02'), asset);
  }

  if (type === 'withdrawal' && rail === 'crypto_network') {
    const networkFees = {
      BTC: '0.00005000',
      ETH: '0.00200000',
      USDT: '2.500000',
      USDC: '2.500000'
    };

    return networkFees[asset] ?? toAssetAmount(0, asset);
  }

  return toAssetAmount(0, asset);
}

export class PaymentService {
  listPayments(filters = {}) {
    return [...store.payments.values()]
      .filter((payment) => !filters.customerId || payment.customerId === filters.customerId)
      .filter((payment) => !filters.status || payment.status === filters.status)
      .filter((payment) => !filters.type || payment.type === filters.type)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  getPayment(paymentId) {
    const payment = store.payments.get(paymentId);

    if (!payment) {
      throw ApiError.notFound('Payment was not found.');
    }

    return payment;
  }

  createPayment(input, idempotencyKey) {
    if (!idempotencyKey) {
      throw ApiError.badRequest('Idempotency-Key header is required for payment creation.');
    }

    const bodyHash = hashBody(input);
    const idempotencyRecord = store.idempotencyKeys.get(idempotencyKey);

    if (idempotencyRecord) {
      if (idempotencyRecord.bodyHash !== bodyHash) {
        throw ApiError.conflict('Idempotency-Key was already used with a different request body.');
      }

      return {
        payment: this.getPayment(idempotencyRecord.paymentId),
        replayed: true
      };
    }

    const payment = input.type === 'conversion'
      ? this.createConversionPayment(input)
      : this.createTransferPayment(input);

    store.payments.set(payment.id, payment);
    store.idempotencyKeys.set(idempotencyKey, {
      bodyHash,
      paymentId: payment.id,
      createdAt: nowIso()
    });

    return { payment, replayed: false };
  }

  createTransferPayment(input) {
    const amount = parsePositiveAmount(input.amount);
    const assetType = getAssetType(input.asset);

    if (!assetType) {
      throw ApiError.badRequest(`Unsupported asset: ${input.asset}.`);
    }

    if (!RAILS_BY_ASSET_TYPE[assetType].includes(input.rail)) {
      throw ApiError.badRequest(`Rail ${input.rail} is not supported for ${assetType} assets.`);
    }

    const feeAmount = calculateTransferFee({
      amount,
      asset: input.asset,
      rail: input.rail,
      type: input.type
    });
    const grossAmount = toAssetAmount(amount, input.asset);
    const totalDebit = toAssetAmount(amount.plus(feeAmount), input.asset);
    const netAmount = input.type === 'deposit'
      ? toAssetAmount(amount.minus(feeAmount), input.asset)
      : grossAmount;

    if (new Decimal(netAmount).lte(0)) {
      throw ApiError.unprocessable('Payment amount is too small after fees.');
    }

    if (input.type === 'withdrawal') {
      walletService.debit(input.customerId, input.asset, totalDebit);
    }

    const timestamp = nowIso();

    return {
      id: `pay_${randomUUID()}`,
      customerId: input.customerId,
      type: input.type,
      status: input.type === 'deposit' ? 'pending' : 'processing',
      assetType,
      asset: input.asset,
      grossAmount,
      feeAmount,
      netAmount,
      totalDebit: input.type === 'withdrawal' ? totalDebit : '0',
      rail: input.rail,
      source: input.source ?? null,
      destination: input.destination ?? null,
      provider: 'internal-simulator',
      providerReference: providerReference(input.rail),
      metadata: input.metadata ?? {},
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  createConversionPayment(input) {
    const sourceAmount = toAssetAmount(parsePositiveAmount(input.sourceAmount, 'sourceAmount'), input.sourceAsset);
    const quote = ratesService.assertQuoteCanBeUsed(input.quoteId, {
      customerId: input.customerId,
      sourceAsset: input.sourceAsset,
      targetAsset: input.targetAsset,
      sourceAmount
    });

    walletService.debit(input.customerId, input.sourceAsset, quote.sourceAmount);
    walletService.credit(input.customerId, input.targetAsset, quote.targetAmount);
    ratesService.markQuoteUsed(input.quoteId);

    const timestamp = nowIso();

    return {
      id: `pay_${randomUUID()}`,
      customerId: input.customerId,
      type: 'conversion',
      status: 'completed',
      sourceAsset: quote.sourceAsset,
      targetAsset: quote.targetAsset,
      sourceAmount: quote.sourceAmount,
      targetAmount: quote.targetAmount,
      quoteId: quote.id,
      rate: quote.rate,
      spreadBps: quote.spreadBps,
      provider: 'internal-simulator',
      providerReference: providerReference('conversion'),
      metadata: input.metadata ?? {},
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: timestamp
    };
  }

  cancelPayment(paymentId) {
    const payment = this.getPayment(paymentId);

    if (payment.status === 'completed') {
      throw ApiError.conflict('Completed payments cannot be canceled.');
    }

    if (payment.status === 'failed' || payment.status === 'canceled') {
      return payment;
    }

    if (payment.type === 'withdrawal') {
      walletService.credit(payment.customerId, payment.asset, payment.totalDebit);
    }

    payment.status = 'canceled';
    payment.updatedAt = nowIso();
    payment.canceledAt = payment.updatedAt;

    return payment;
  }

  applyProviderEvent(event) {
    if (store.webhookEvents.has(event.eventId)) {
      return {
        duplicate: true,
        payment: this.getPayment(event.paymentId)
      };
    }

    const payment = this.getPayment(event.paymentId);

    if (event.type === 'payment.completed') {
      this.completePayment(payment, event);
    }

    if (event.type === 'payment.failed') {
      this.failPayment(payment, event);
    }

    store.webhookEvents.set(event.eventId, Date.now());

    return { duplicate: false, payment };
  }

  completePayment(payment, event) {
    if (payment.status === 'completed') {
      return payment;
    }

    if (payment.status === 'canceled') {
      throw ApiError.conflict('Canceled payments cannot be completed.');
    }

    if (payment.type === 'deposit') {
      walletService.credit(payment.customerId, payment.asset, payment.netAmount);
    }

    payment.status = 'completed';
    payment.providerReference = event.providerReference ?? payment.providerReference;
    payment.updatedAt = nowIso();
    payment.completedAt = payment.updatedAt;

    return payment;
  }

  failPayment(payment, event) {
    if (payment.status === 'completed') {
      throw ApiError.conflict('Completed payments cannot be failed.');
    }

    if (payment.status === 'failed' || payment.status === 'canceled') {
      return payment;
    }

    if (payment.type === 'withdrawal') {
      walletService.credit(payment.customerId, payment.asset, payment.totalDebit);
    }

    payment.status = 'failed';
    payment.failureReason = event.failureReason ?? 'Provider reported failure.';
    payment.providerReference = event.providerReference ?? payment.providerReference;
    payment.updatedAt = nowIso();
    payment.failedAt = payment.updatedAt;

    return payment;
  }
}

export const paymentService = new PaymentService();
