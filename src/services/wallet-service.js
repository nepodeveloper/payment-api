import { CURRENCY_METADATA, isSupportedAsset, SUPPORTED_ASSETS } from '../constants/currencies.js';
import { store } from '../repositories/in-memory-store.js';
import { ApiError } from '../utils/api-error.js';
import { Decimal, toAssetAmount } from '../utils/money.js';

export class WalletService {
  getBalances(customerId) {
    const wallet = store.ensureWallet(customerId);

    return SUPPORTED_ASSETS.map((asset) => ({
      asset,
      type: CURRENCY_METADATA[asset].type,
      available: wallet[asset]
    }));
  }

  credit(customerId, asset, amount) {
    this.assertSupportedAsset(asset);
    const wallet = store.ensureWallet(customerId);
    wallet[asset] = toAssetAmount(new Decimal(wallet[asset]).plus(amount), asset);
    return wallet[asset];
  }

  debit(customerId, asset, amount) {
    this.assertSupportedAsset(asset);
    const wallet = store.ensureWallet(customerId);
    const currentBalance = new Decimal(wallet[asset]);
    const requestedAmount = new Decimal(amount);

    if (currentBalance.lt(requestedAmount)) {
      throw ApiError.unprocessable('Insufficient funds for this payment.', {
        asset,
        available: wallet[asset],
        required: toAssetAmount(requestedAmount, asset)
      });
    }

    wallet[asset] = toAssetAmount(currentBalance.minus(requestedAmount), asset);
    return wallet[asset];
  }

  assertSupportedAsset(asset) {
    if (!isSupportedAsset(asset)) {
      throw ApiError.badRequest(`Unsupported asset: ${asset}.`);
    }
  }
}

export const walletService = new WalletService();
