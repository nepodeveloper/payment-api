export class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'bad_request', message, details);
  }

  static unauthorized(message = 'Authentication is required.') {
    return new ApiError(401, 'unauthorized', message);
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new ApiError(403, 'forbidden', message);
  }

  static notFound(message = 'The requested resource was not found.') {
    return new ApiError(404, 'not_found', message);
  }

  static conflict(message, details) {
    return new ApiError(409, 'conflict', message, details);
  }

  static unprocessable(message, details) {
    return new ApiError(422, 'unprocessable_entity', message, details);
  }
}
