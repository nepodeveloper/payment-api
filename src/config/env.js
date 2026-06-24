import 'dotenv/config';
import { z } from 'zod';

const DEFAULT_API_TOKEN = 'dev-secret-token';
const DEFAULT_WEBHOOK_SECRET = 'dev-webhook-secret';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_TOKEN: z.string().min(8).default(DEFAULT_API_TOKEN),
  WEBHOOK_SECRET: z.string().min(8).default(DEFAULT_WEBHOOK_SECRET),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
}).superRefine((data, ctx) => {
  if (data.NODE_ENV !== 'production') {
    return;
  }

  if (data.API_TOKEN === DEFAULT_API_TOKEN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['API_TOKEN'],
      message: 'API_TOKEN must be set to a non-default value in production.'
    });
  }

  if (data.WEBHOOK_SECRET === DEFAULT_WEBHOOK_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['WEBHOOK_SECRET'],
      message: 'WEBHOOK_SECRET must be set to a non-default value in production.'
    });
  }
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export const corsOrigin = env.CORS_ORIGIN === '*'
  ? true
  : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
