import { AppError } from '../utils/AppError.js';
export function requireAuth(service) {
  return async (req, _res, next) => {
    if (!req.session?.userId)
      throw new AppError('UNAUTHENTICATED', 401, 'Authentication required');
    req.user = await service.current(req.session.userId);
    next();
  };
}
export function requireRole(...roles) {
  return (req, _res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : next(new AppError('FORBIDDEN', 403, 'Insufficient permissions'));
}
