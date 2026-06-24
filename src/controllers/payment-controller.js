import { paymentService } from '../services/payment-service.js';
import { sendSuccess } from '../utils/http-response.js';

export function listPayments(req, res) {
  const payments = paymentService.listPayments(req.validated.query);

  return sendSuccess(res, payments, {
    meta: {
      count: payments.length
    }
  });
}

export function createPayment(req, res) {
  const idempotencyKey = req.get('idempotency-key');
  const result = paymentService.createPayment(req.validated.body, idempotencyKey);

  return sendSuccess(res, result.payment, {
    statusCode: result.replayed ? 200 : 201,
    meta: {
      idempotentReplay: result.replayed
    }
  });
}

export function getPayment(req, res) {
  const payment = paymentService.getPayment(req.validated.params.paymentId);
  return sendSuccess(res, payment);
}

export function cancelPayment(req, res) {
  const payment = paymentService.cancelPayment(req.validated.params.paymentId);
  return sendSuccess(res, payment);
}
