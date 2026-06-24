import { Router } from 'express';
import { createQuote, getQuote } from '../controllers/quote-controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import { createQuoteBodySchema, quoteIdParamSchema } from '../validators/schemas.js';

export const quoteRouter = Router();

quoteRouter.post('/', validateRequest({ body: createQuoteBodySchema }), createQuote);
quoteRouter.get('/:quoteId', validateRequest({ params: quoteIdParamSchema }), getQuote);
