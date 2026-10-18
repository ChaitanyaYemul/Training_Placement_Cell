import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger.js';
export function requestLogger(req, res, next) {
  const requestId = randomUUID(),
    started = performance.now();
  res.set('X-Request-Id', requestId);
  res.once('finish', () =>
    logger.info(
      {
        requestId,
        method: req.method,
        route: req.route?.path || 'unmatched',
        status: res.statusCode,
        elapsedMs: Math.round(performance.now() - started),
      },
      'HTTP request',
    ),
  );
  next();
}
