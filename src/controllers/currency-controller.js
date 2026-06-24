import { CURRENCY_METADATA } from '../constants/currencies.js';
import { sendSuccess } from '../utils/http-response.js';

export function listCurrencies(req, res) {
  const { type } = req.validated.query;
  const currencies = Object.values(CURRENCY_METADATA)
    .filter((currency) => !type || currency.type === type);

  return sendSuccess(res, currencies, {
    meta: {
      count: currencies.length
    }
  });
}
