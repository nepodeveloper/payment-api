import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireAuth(req, _res, next) {
  const bearerValue = req.get('authorization') ?? '';
  const bearerToken = bearerValue.startsWith('Bearer ') ? bearerValue.slice(7) : undefined;
  const apiKey = req.get('x-api-key');
  const token = bearerToken || apiKey;

  if (!token) {
    return next(ApiError.unauthorized());
  }

  if (!safeCompare(token, env.API_TOKEN)) {
    return next(ApiError.forbidden('The supplied API credential is invalid.'));
  }

  req.auth = {
    type: bearerToken ? 'bearer' : 'api_key'
  };

  return next();
}
