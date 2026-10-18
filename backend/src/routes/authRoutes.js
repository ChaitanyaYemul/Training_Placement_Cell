import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authController } from '../controllers/authController.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/authorization.js';
import { validate } from '../middleware/validate.js';
import { registration, login } from '../validators/authValidator.js';
export function authRoutes(service, settings) {
  const router = Router(),
    controller = authController(service, settings),
    csrf = csrfProtection(settings);
  const limiter = rateLimit({
    windowMs: 900000,
    limit: settings.AUTH_RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts',
      },
    },
  });
  router.get('/csrf-token', controller.token);
  router.post(
    '/register',
    limiter,
    csrf,
    validate(registration),
    controller.register,
  );
  router.post('/login', limiter, csrf, validate(login), controller.login);
  router.get('/me', requireAuth(service), controller.me);
  router.post('/logout', requireAuth(service), csrf, controller.logout);
  return router;
}
