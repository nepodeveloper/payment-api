import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { receiveWebhook } from '../controllers/webhook-controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import { verifyWebhookSignature } from '../middleware/verify-webhook-signature.js';
import { webhookBodySchema, webhookProviderParamSchema } from '../validators/schemas.js';

export const webhookRouter = Router();

const webhookLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX * 5,
  standardHeaders: true,
  legacyHeaders: false
});

webhookRouter.post(
  '/providers/:provider',
  webhookLimiter,
  verifyWebhookSignature,
  validateRequest({ params: webhookProviderParamSchema, body: webhookBodySchema }),
  receiveWebhook
);
