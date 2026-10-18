import { connectMongo } from '../src/config/mongoConnection.js';
import { applyMongoSchemas } from '../src/repositories/mongoSchemaRepository.js';
import { logger } from '../src/config/logger.js';
let connection;
try {
  connection = await connectMongo();
  await applyMongoSchemas(connection);
  logger.info('MongoDB collection validators and indexes applied');
} catch {
  logger.error(
    'MongoDB setup failed; check configuration, schema compatibility, and database availability',
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
}
