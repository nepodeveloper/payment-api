export const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'ZAR', 'JPY'];
export const CRYPTO_CURRENCIES = ['BTC', 'ETH', 'USDT', 'USDC'];
export const SUPPORTED_ASSETS = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];

export const CURRENCY_METADATA = {
  USD: { code: 'USD', type: 'fiat', name: 'US Dollar', precision: 2 },
  EUR: { code: 'EUR', type: 'fiat', name: 'Euro', precision: 2 },
  GBP: { code: 'GBP', type: 'fiat', name: 'British Pound', precision: 2 },
  ZAR: { code: 'ZAR', type: 'fiat', name: 'South African Rand', precision: 2 },
  JPY: { code: 'JPY', type: 'fiat', name: 'Japanese Yen', precision: 0 },
  BTC: { code: 'BTC', type: 'crypto', name: 'Bitcoin', precision: 8 },
  ETH: { code: 'ETH', type: 'crypto', name: 'Ethereum', precision: 8 },
  USDT: { code: 'USDT', type: 'crypto', name: 'Tether USD', precision: 6 },
  USDC: { code: 'USDC', type: 'crypto', name: 'USD Coin', precision: 6 }
};

export const RAILS_BY_ASSET_TYPE = {
  fiat: ['bank_transfer', 'card', 'internal_transfer'],
  crypto: ['crypto_network', 'internal_transfer']
};

export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'canceled'
];

export function isSupportedAsset(asset) {
  return SUPPORTED_ASSETS.includes(asset);
}

export function getAssetType(asset) {
  return CURRENCY_METADATA[asset]?.type;
}

export function getAssetPrecision(asset) {
  return CURRENCY_METADATA[asset]?.precision ?? 8;
}
