import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error.js';
import { isProduction } from '../config/env.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} was not found.`));
}

export function errorHandler(err, req, res, _next) {
  const requestId = res.locals.requestId ?? req.context?.requestId;

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Request validation failed.',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        })),
        requestId
      }
    });
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'internal_server_error';
  const message = statusCode >= 500 && isProduction
    ? 'An unexpected error occurred.'
    : err.message;

  if (statusCode >= 500 && req.log) {
    req.log.error({ err, requestId }, 'Unhandled API error');
  }

  return res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details,
      requestId,
      stack: !isProduction && statusCode >= 500 ? err.stack : undefined
    }
  });
}
