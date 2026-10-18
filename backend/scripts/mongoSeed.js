import { assertDevelopmentSeed } from '../src/config/databaseEnv.js';
import { createMysqlPool } from '../src/config/mysqlPool.js';
import { connectMongo } from '../src/config/mongoConnection.js';
import { seedRecruitmentSamples } from '../src/services/sampleSeedService.js';
import { logger } from '../src/config/logger.js';
assertDevelopmentSeed();
const [driveId, authorId] = process.argv.slice(2).map(Number);
const pool = createMysqlPool();
let connection;
try {
  connection = await connectMongo();
  await seedRecruitmentSamples(pool, connection, driveId, authorId);
  logger.info('MongoDB samples seeded without overwriting existing documents');
} catch {
  logger.error(
    'Mongo sample seed failed; provide valid drive/author ids and configured databases with validators applied',
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
  await pool.end();
}
