import { logger } from '../config/logger.js';
export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return _next(error);
  const isMalformedJson = error.type === 'entity.parse.failed';
  const tooLarge = error.type === 'entity.too.large';
  const status = isMalformedJson ? 400 : tooLarge ? 413 : 500;
  if (status === 500)
    logger.error({ event: 'request_failed' }, 'Unexpected request failure');
  res.status(status).json({
    success: false,
    error: {
      code: isMalformedJson
        ? 'VALIDATION_ERROR'
        : tooLarge
          ? 'PAYLOAD_TOO_LARGE'
          : 'INTERNAL_ERROR',
      message: isMalformedJson
        ? 'Invalid JSON body'
        : tooLarge
          ? 'Request body is too large'
          : 'An unexpected error occurred',
    },
  });
}
