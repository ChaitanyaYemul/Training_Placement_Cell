import { promisify } from 'node:util';
import { csrfToken } from '../middleware/csrf.js';
import { SESSION_COOKIE } from '../config/sessionConfig.js';
export function authController(service, settings) {
  return {
    token(req, res) {
      req.session.csrfInitialized = true;
      res.set('Cache-Control', 'no-store').json({
        success: true,
        data: { csrfToken: csrfToken(req, settings.CSRF_SECRET) },
      });
    },
    async register(req, res) {
      res.status(201).json({
        success: true,
        data: await service.register(req.validated.body),
      });
    },
    async login(req, res) {
      const user = await service.login(req.validated.body);
      await promisify(req.session.regenerate.bind(req.session))();
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.csrfInitialized = true;
      await promisify(req.session.save.bind(req.session))();
      res.json({
        success: true,
        data: { user, csrfToken: csrfToken(req, settings.CSRF_SECRET) },
      });
    },
    me(req, res) {
      res.json({ success: true, data: req.user });
    },
    async logout(req, res) {
      await promisify(req.session.destroy.bind(req.session))();
      res
        .clearCookie(SESSION_COOKIE, {
          httpOnly: true,
          secure: settings.secure,
          sameSite: 'lax',
          path: '/',
        })
        .status(204)
        .end();
    },
  };
}
