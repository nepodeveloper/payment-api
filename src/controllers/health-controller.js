import { sendSuccess } from '../utils/http-response.js';

export function getHealth(_req, res) {
  return sendSuccess(res, {
    status: 'ok',
    service: 'crypto-forex-payment-api',
    timestamp: new Date().toISOString()
  });
}
