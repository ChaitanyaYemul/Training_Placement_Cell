import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);
  const codes = {
    ER_DUP_ENTRY: [409, 'CONFLICT', 'Record already exists'],
    ER_NO_REFERENCED_ROW_2: [
      400,
      'VALIDATION_ERROR',
      'Referenced record does not exist',
    ],
    ER_ROW_IS_REFERENCED_2: [
      409,
      'CONFLICT',
      'Record is referenced; deactivate or archive it',
    ],
    ER_CHECK_CONSTRAINT_VIOLATED: [400, 'VALIDATION_ERROR', 'Invalid values'],
    ER_BAD_NULL_ERROR: [400, 'VALIDATION_ERROR', 'Required value missing'],
    ECONNREFUSED: [503, 'SERVICE_UNAVAILABLE', 'Database unavailable'],
    PROTOCOL_CONNECTION_LOST: [
      503,
      'SERVICE_UNAVAILABLE',
      'Database unavailable',
    ],
    11000: [409, 'CONFLICT', 'Record already exists'],
    121: [400, 'VALIDATION_ERROR', 'Invalid document'],
  };
  let result = codes[error.code];
  if (error.type === 'entity.parse.failed')
    result = [400, 'VALIDATION_ERROR', 'Invalid JSON body'];
  if (error.type === 'entity.too.large')
    result = [413, 'PAYLOAD_TOO_LARGE', 'Request body is too large'];
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name))
    result = [400, 'VALIDATION_ERROR', 'Invalid document'];
  if (error.name === 'VersionError')
    result = [409, 'CONFLICT', 'Document changed; reload and retry'];
  if (['MongoServerSelectionError', 'MongoNetworkError'].includes(error.name))
    result = [503, 'SERVICE_UNAVAILABLE', 'Database unavailable'];
  if (error instanceof AppError)
    result = [error.status, error.code, error.message];
  const [status, code, message] = result || [
    500,
    'INTERNAL_ERROR',
    'An unexpected error occurred',
  ];
  if (status >= 500)
    logger.error({ event: 'request_failed', code }, 'Request failed');
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(error instanceof AppError && error.details
        ? { details: error.details }
        : {}),
    },
  });
}
