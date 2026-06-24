import { walletService } from '../services/wallet-service.js';
import { sendSuccess } from '../utils/http-response.js';

export function getBalances(req, res) {
  const balances = walletService.getBalances(req.validated.params.customerId);

  return sendSuccess(res, balances, {
    meta: {
      count: balances.length
    }
  });
}
