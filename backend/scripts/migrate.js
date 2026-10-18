import { createMysqlPool } from '../src/config/mysqlPool.js';
import {
  readMigrations,
  migrateMysql,
} from '../src/repositories/migrationRepository.js';
import { logger } from '../src/config/logger.js';
const pool = createMysqlPool();
try {
  const applied = await migrateMysql(pool, await readMigrations());
  logger.info({ applied }, 'MySQL migrations complete');
} catch {
  logger.error(
    'MySQL migration failed; check configuration, migration ledger, and database availability',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
