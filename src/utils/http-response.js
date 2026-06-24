export function sendSuccess(res, data, options = {}) {
  const { statusCode = 200, meta = {} } = options;

  return res.status(statusCode).json({
    data,
    meta: {
      requestId: res.locals.requestId,
      ...meta
    }
  });
}

export function sendAccepted(res, data, meta = {}) {
  return sendSuccess(res, data, { statusCode: 202, meta });
}
