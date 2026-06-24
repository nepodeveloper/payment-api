import { Router } from 'express';
import { getBalances } from '../controllers/wallet-controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import { customerIdParamSchema } from '../validators/schemas.js';

export const walletRouter = Router();

walletRouter.get('/:customerId/balances', validateRequest({ params: customerIdParamSchema }), getBalances);
