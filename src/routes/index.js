import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess } from '../utils/http-response.js';
import { currencyRouter } from './currency-routes.js';
import { healthRouter } from './health-routes.js';
import { paymentRouter } from './payment-routes.js';
import { quoteRouter } from './quote-routes.js';
import { walletRouter } from './wallet-routes.js';
import { webhookRouter } from './webhook-routes.js';

export const router = Router();

router.get('/', (_req, res) => sendSuccess(res, {
  service: 'crypto-forex-payment-api',
  status: 'ok',
  endpoints: {
    health: '/health',
    currencies: '/api/v1/currencies',
    quotes: '/api/v1/quotes',
    wallets: '/api/v1/wallets',
    payments: '/api/v1/payments',
    webhooks: '/api/v1/webhooks'
  }
}));

router.use('/health', healthRouter);
router.use('/api/v1/currencies', currencyRouter);
router.use('/api/v1/quotes', requireAuth, quoteRouter);
router.use('/api/v1/wallets', requireAuth, walletRouter);
router.use('/api/v1/payments', requireAuth, paymentRouter);
router.use('/api/v1/webhooks', webhookRouter);
