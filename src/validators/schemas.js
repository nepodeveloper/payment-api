import { z } from 'zod';
import { PAYMENT_STATUSES, SUPPORTED_ASSETS } from '../constants/currencies.js';

const decimalAmountSchema = z.union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,18})?$/.test(value), {
    message: 'Must be a positive decimal string.'
  })
  .refine((value) => Number(value) > 0, {
    message: 'Must be greater than zero.'
  });

const assetSchema = z.string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((asset) => SUPPORTED_ASSETS.includes(asset), {
    message: 'Unsupported asset.'
  });

const customerIdSchema = z.string().trim().min(3).max(80);
const metadataSchema = z.record(z.string(), z.unknown()).default({});

const paymentPartySchema = z.object({
  accountId: z.string().trim().min(1).max(120).optional(),
  walletAddress: z.string().trim().min(8).max(180).optional(),
  network: z.string().trim().min(2).max(40).optional(),
  externalReference: z.string().trim().min(1).max(120).optional()
}).strict();

const transferPaymentSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  customerId: customerIdSchema,
  asset: assetSchema,
  amount: decimalAmountSchema,
  rail: z.enum(['bank_transfer', 'card', 'crypto_network', 'internal_transfer']),
  source: paymentPartySchema.optional(),
  destination: paymentPartySchema.optional(),
  metadata: metadataSchema
}).strict();

const conversionPaymentSchema = z.object({
  type: z.literal('conversion'),
  customerId: customerIdSchema,
  sourceAsset: assetSchema,
  targetAsset: assetSchema,
  sourceAmount: decimalAmountSchema,
  quoteId: z.string().trim().startsWith('quote_'),
  metadata: metadataSchema
}).strict();

export const createPaymentBodySchema = z.discriminatedUnion('type', [
  transferPaymentSchema,
  conversionPaymentSchema
]);

export const paymentIdParamSchema = z.object({
  paymentId: z.string().trim().startsWith('pay_')
});

export const customerIdParamSchema = z.object({
  customerId: customerIdSchema
});

export const listPaymentsQuerySchema = z.object({
  customerId: customerIdSchema.optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  type: z.enum(['deposit', 'withdrawal', 'conversion']).optional()
});

export const listCurrenciesQuerySchema = z.object({
  type: z.enum(['fiat', 'crypto']).optional()
});

export const createQuoteBodySchema = z.object({
  customerId: customerIdSchema,
  sourceAsset: assetSchema,
  targetAsset: assetSchema,
  sourceAmount: decimalAmountSchema
}).strict();

export const quoteIdParamSchema = z.object({
  quoteId: z.string().trim().startsWith('quote_')
});

export const webhookProviderParamSchema = z.object({
  provider: z.string().trim().min(2).max(80)
});

export const webhookBodySchema = z.object({
  eventId: z.string().trim().min(8).max(120),
  type: z.enum(['payment.completed', 'payment.failed']),
  paymentId: z.string().trim().startsWith('pay_'),
  providerReference: z.string().trim().min(1).max(120).optional(),
  failureReason: z.string().trim().min(1).max(240).optional(),
  occurredAt: z.string().datetime().optional(),
  metadata: metadataSchema
}).strict();
