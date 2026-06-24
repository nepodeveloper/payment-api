import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

export function verifyWebhookSignature(req, _res, next) {
  const signature = req.get('x-webhook-signature');

  if (!signature) {
    return next(ApiError.unauthorized('Missing x-webhook-signature header.'));
  }

  const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
  const expected = `sha256=${createHmac('sha256', env.WEBHOOK_SECRET).update(rawBody).digest('hex')}`;

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return next(ApiError.forbidden('Invalid webhook signature.'));
  }

  return next();
}
