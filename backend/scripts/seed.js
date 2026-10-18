import { assertDevelopmentSeed } from '../src/config/databaseEnv.js';
import { createMysqlPool } from '../src/config/mysqlPool.js';
import { seedMysql } from '../src/repositories/seedRepository.js';
import { logger } from '../src/config/logger.js';
assertDevelopmentSeed();
const pool = createMysqlPool();
try {
  const files = await seedMysql(pool);
  logger.info({ files }, 'Reference/sample data seeded; no accounts created');
} catch {
  logger.error(
    'MySQL seed failed; check database configuration and applied migrations',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
