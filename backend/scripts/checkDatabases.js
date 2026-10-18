import { createMysqlPool } from '../src/config/mysqlPool.js';
import { connectMongo } from '../src/config/mongoConnection.js';
import {
  checkMysql,
  checkMongo,
} from '../src/repositories/databaseHealthRepository.js';
import { logger } from '../src/config/logger.js';
const pool = createMysqlPool();
let connection;
try {
  connection = await connectMongo();
  const mysql = await checkMysql(pool);
  const mongodb = await checkMongo(connection);
  logger.info({ mysql, mongodb }, 'Database connectivity verified');
} catch {
  logger.error(
    'Database connectivity check failed; connection details were not logged',
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
  await pool.end();
}
