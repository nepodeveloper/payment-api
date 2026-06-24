import { randomUUID } from 'node:crypto';

export function requestContext(req, res, next) {
  const requestId = req.get('x-request-id') || randomUUID();

  req.context = { requestId };
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}
