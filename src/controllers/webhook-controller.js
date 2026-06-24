import { paymentService } from '../services/payment-service.js';
import { sendSuccess } from '../utils/http-response.js';

export function receiveWebhook(req, res) {
  const result = paymentService.applyProviderEvent(req.validated.body);

  return sendSuccess(res, {
    accepted: true,
    duplicate: result.duplicate,
    provider: req.validated.params.provider,
    payment: result.payment
  });
}
