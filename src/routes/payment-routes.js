import { Router } from 'express';
import {
  cancelPayment,
  createPayment,
  getPayment,
  listPayments
} from '../controllers/payment-controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import {
  createPaymentBodySchema,
  listPaymentsQuerySchema,
  paymentIdParamSchema
} from '../validators/schemas.js';

export const paymentRouter = Router();

paymentRouter.get('/', validateRequest({ query: listPaymentsQuerySchema }), listPayments);
paymentRouter.post('/', validateRequest({ body: createPaymentBodySchema }), createPayment);
paymentRouter.get('/:paymentId', validateRequest({ params: paymentIdParamSchema }), getPayment);
paymentRouter.post('/:paymentId/cancel', validateRequest({ params: paymentIdParamSchema }), cancelPayment);
