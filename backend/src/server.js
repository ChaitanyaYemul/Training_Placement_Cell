import { connectMongo } from './config/mongoConnection.js';
import { businessDependencies } from './config/businessDependencies.js';
import { createApp } from './app.js';
import { createMysqlPool } from './config/mysqlPool.js';
import { getAuthSettings } from './config/authConfig.js';
import { checkMysql } from './repositories/databaseHealthRepository.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
let pool, app, mongo;
try {
  const security = getAuthSettings();
  pool = createMysqlPool();
  await checkMysql(pool);
  mongo = await connectMongo();
  app = createApp({
    pool,
    security,
    mountBusiness: businessDependencies(pool, mongo, security),
  });
  const server = app.listen(env.PORT, '0.0.0.0', () =>
    logger.info(
      { port: env.PORT },
      'Placement API listening with MySQL-backed sessions',
    ),
  );
  const closeResources = async () => {
    await app.locals.closeSessions();
    await pool.end();
    await mongo.close();
  };
  server.on('error', async () => {
    logger.fatal('API listener failed');
    await closeResources();
    process.exitCode = 1;
  });
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, () => {
      server.close(async () => {
        await closeResources();
        process.exit(0);
      });
      setTimeout(() => server.closeAllConnections(), 5000).unref();
    });
} catch {
  logger.fatal(
    'API startup failed; configure database access, apply migrations and supply valid session/CSRF secrets',
  );
  if (app) await app.locals.closeSessions();
  if (mongo) await mongo.close();
  if (pool) await pool.end();
  process.exitCode = 1;
}
