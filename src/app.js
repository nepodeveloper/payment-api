import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { corsOrigin, env, isTest } from './config/env.js';
import { requestContext } from './middleware/request-context.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { router } from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(helmet());
  app.use(cors({ origin: corsOrigin }));

  if (!isTest) {
    app.use(pinoHttp({ level: env.LOG_LEVEL }));
  }

  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/api/v1/webhooks')
  }));

  app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    }
  }));

  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
