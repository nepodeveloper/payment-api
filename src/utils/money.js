import Decimal from 'decimal.js';
import { getAssetPrecision } from '../constants/currencies.js';
import { ApiError } from './api-error.js';

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP
});

export function parsePositiveAmount(value, fieldName = 'amount') {
  const rawValue = String(value);

  if (!/^\d+(\.\d{1,18})?$/.test(rawValue)) {
    throw ApiError.badRequest(`${fieldName} must be a positive decimal string.`);
  }

  const amount = new Decimal(rawValue);

  if (!amount.isFinite() || amount.lte(0)) {
    throw ApiError.badRequest(`${fieldName} must be greater than zero.`);
  }

  return amount;
}

export function toAssetAmount(value, asset) {
  const amount = new Decimal(value);
  return amount.toFixed(getAssetPrecision(asset));
}

export { Decimal };
