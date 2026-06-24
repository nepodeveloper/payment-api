import { ratesService } from '../services/rates-service.js';
import { sendSuccess } from '../utils/http-response.js';

export function createQuote(req, res) {
  const quote = ratesService.createQuote(req.validated.body);
  return sendSuccess(res, quote, { statusCode: 201 });
}

export function getQuote(req, res) {
  const quote = ratesService.getQuote(req.validated.params.quoteId);
  return sendSuccess(res, quote);
}
