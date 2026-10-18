import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/AppError.js';
export function csrfToken(req, secret) {
  return createHmac('sha256', secret).update(req.sessionID).digest('base64url');
}
export function csrfProtection(settings) {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const token = req.get('X-CSRF-Token');
    const expected = csrfToken(req, settings.CSRF_SECRET);
    if (
      !settings.origins.includes(req.get('Origin')) ||
      !req.session.csrfInitialized ||
      typeof token !== 'string' ||
      Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) {
      return next(
        new AppError('FORBIDDEN', 403, 'Invalid request origin or CSRF token'),
      );
    }
    next();
  };
}
