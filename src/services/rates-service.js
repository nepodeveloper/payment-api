import { randomUUID } from 'node:crypto';
import { getAssetPrecision, isSupportedAsset } from '../constants/currencies.js';
import { store } from '../repositories/in-memory-store.js';
import { ApiError } from '../utils/api-error.js';
import { Decimal, parsePositiveAmount, toAssetAmount } from '../utils/money.js';

const MOCK_USD_PRICES = {
  USD: '1',
  EUR: '1.08',
  GBP: '1.27',
  ZAR: '0.054',
  JPY: '0.0064',
  BTC: '65000',
  ETH: '3500',
  USDT: '1',
  USDC: '1'
};

const QUOTE_TTL_MS = 30_000;
const SPREAD_RATE = new Decimal('0.002');

export class RatesService {
  createQuote(input) {
    const sourceAsset = input.sourceAsset;
    const targetAsset = input.targetAsset;
    const sourceAmount = parsePositiveAmount(input.sourceAmount, 'sourceAmount');

    this.assertSupportedPair(sourceAsset, targetAsset);

    const rate = this.getRate(sourceAsset, targetAsset).mul(new Decimal(1).minus(SPREAD_RATE));
    const targetAmount = sourceAmount.mul(rate);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + QUOTE_TTL_MS);

    const quote = {
      id: `quote_${randomUUID()}`,
      customerId: input.customerId,
      sourceAsset,
      targetAsset,
      sourceAmount: toAssetAmount(sourceAmount, sourceAsset),
      targetAmount: toAssetAmount(targetAmount, targetAsset),
      rate: rate.toDecimalPlaces(getAssetPrecision(targetAsset) + 8).toString(),
      spreadBps: 20,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      usedAt: null
    };

    store.quotes.set(quote.id, quote);
    return quote;
  }

  getQuote(quoteId) {
    const quote = store.quotes.get(quoteId);

    if (!quote) {
      throw ApiError.notFound('Quote was not found.');
    }

    return quote;
  }

  assertQuoteCanBeUsed(quoteId, expected) {
    const quote = this.getQuote(quoteId);

    if (quote.usedAt) {
      throw ApiError.conflict('Quote has already been used.');
    }

    if (new Date(quote.expiresAt).getTime() <= Date.now()) {
      throw ApiError.unprocessable('Quote has expired. Create a new quote and retry.');
    }

    if (expected.customerId && quote.customerId !== expected.customerId) {
      throw ApiError.forbidden('Quote belongs to a different customer.');
    }

    const mismatches = ['sourceAsset', 'targetAsset', 'sourceAmount']
      .filter((field) => quote[field] !== expected[field]);

    if (mismatches.length > 0) {
      throw ApiError.conflict('Quote does not match the requested conversion.', { mismatches });
    }

    return quote;
  }

  markQuoteUsed(quoteId) {
    const quote = this.getQuote(quoteId);
    quote.usedAt = new Date().toISOString();
    return quote;
  }

  getRate(sourceAsset, targetAsset) {
    this.assertSupportedPair(sourceAsset, targetAsset);
    return new Decimal(MOCK_USD_PRICES[sourceAsset]).div(MOCK_USD_PRICES[targetAsset]);
  }

  assertSupportedPair(sourceAsset, targetAsset) {
    if (!isSupportedAsset(sourceAsset)) {
      throw ApiError.badRequest(`Unsupported source asset: ${sourceAsset}.`);
    }

    if (!isSupportedAsset(targetAsset)) {
      throw ApiError.badRequest(`Unsupported target asset: ${targetAsset}.`);
    }

    if (sourceAsset === targetAsset) {
      throw ApiError.badRequest('sourceAsset and targetAsset must be different.');
    }
  }
}

export const ratesService = new RatesService();
