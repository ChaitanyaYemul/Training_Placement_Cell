import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(
    { port: env.PORT, phase: 'initialization' },
    'Placement API listening; databases are not configured',
  );
});
server.on('error', () => {
  logger.fatal({ event: 'listen_failed' }, 'Could not start API server');
  process.exitCode = 1;
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => server.closeAllConnections(), 5000).unref();
  });
}
