import { env } from './env.js';
import {
  getMysqlSettings,
  getMongoSettings,
  mongoDatabaseName,
} from './databaseEnv.js';

export function assertDemoSettings(nodeEnv, mysqlDatabase, mongoDatabase) {
  if (nodeEnv !== 'development')
    throw new Error('Demo provisioning requires NODE_ENV=development');
  if (
    !/^[A-Za-z0-9_]+_demo$/.test(mysqlDatabase || '') ||
    mongoDatabase !== mysqlDatabase
  )
    throw new Error('Demo databases must have matching names ending in _demo');
  return { mysqlDatabase, mongoDatabase };
}

export function getDemoSettings() {
  return assertDemoSettings(
    env.NODE_ENV,
    getMysqlSettings().MYSQL_DATABASE,
    mongoDatabaseName(getMongoSettings().MONGODB_URI),
  );
}
