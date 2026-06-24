import { Router } from 'express';
import { listCurrencies } from '../controllers/currency-controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import { listCurrenciesQuerySchema } from '../validators/schemas.js';

export const currencyRouter = Router();

currencyRouter.get('/', validateRequest({ query: listCurrenciesQuerySchema }), listCurrencies);
