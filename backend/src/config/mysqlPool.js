import mysql from 'mysql2/promise';
import { getMysqlSettings } from './databaseEnv.js';
export function createMysqlPool(settings = getMysqlSettings()) {
  const pool = mysql.createPool({
    host: settings.MYSQL_HOST,
    port: settings.MYSQL_PORT,
    user: settings.MYSQL_USER,
    password: settings.MYSQL_PASSWORD,
    database: settings.MYSQL_DATABASE,
    charset: 'utf8mb4',
    timezone: 'Z',
    decimalNumbers: true,
    dateStrings: true,
    connectionLimit: 10,
    connectTimeout: 5000,
    multipleStatements: false,
    enableKeepAlive: true,
  });
  pool.pool.on('connection', (connection) => {
    // Queued before this connection can execute application statements.
    connection.query(
      "SET SESSION time_zone = '+00:00', sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
    );
  });
  return pool;
}
