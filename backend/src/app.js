import { requestLogger } from './middleware/requestLogger.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { sessionConfig } from './config/sessionConfig.js';
import { authRepository } from './repositories/authRepository.js';
import { authService } from './services/authService.js';
import { authRoutes } from './routes/authRoutes.js';
import { env } from './config/env.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp({ pool, security, mountBusiness } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  if (pool)
    app.get('/api/health', (_req, res) =>
      res.json({
        success: true,
        data: {
          status: 'ok',
          service: 'placement-api',
          phase: 'authentication',
          databases: 'not-checked',
        },
      }),
    );
  app.use('/api', healthRoutes);
  if (pool) {
    app.set('trust proxy', security.TRUST_PROXY_HOPS);
    const sessions = sessionConfig(pool, security);
    const authentication = authService(authRepository(pool));
    app.locals.closeSessions = () => sessions.store.close();
    app.use(sessions.middleware);
    app.use('/api', (_req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    });
    app.use('/api/auth', authRoutes(authentication, security));
    if (mountBusiness) mountBusiness(app, authentication);
  }
  app.use((_req, res) =>
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    }),
  );
  app.use(errorHandler);

  return app;
}
export const app = createApp();
