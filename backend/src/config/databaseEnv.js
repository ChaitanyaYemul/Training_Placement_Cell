import { z } from 'zod';
import { env } from './env.js';
const mysqlSchema = z.object({
  MYSQL_HOST: z.string().min(1),
  MYSQL_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string(),
  MYSQL_DATABASE: z.string().regex(/^[A-Za-z0-9_]{1,64}$/),
});
const mongoSchema = z.object({
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
});
function parse(schema, values) {
  const result = schema.safeParse(values);
  if (!result.success)
    throw new Error(
      `Missing or invalid database settings: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  return result.data;
}
export function getMysqlSettings() {
  return parse(mysqlSchema, env);
}
export function getMongoSettings() {
  return parse(mongoSchema, env);
}
export function assertTestDatabase(name) {
  if (!/^[A-Za-z0-9_]+_test$/.test(name || ''))
    throw new Error(
      'Database tests require an explicit database name ending in _test',
    );
}
export function mongoDatabaseName(uri) {
  // Parse only the path; never include connection strings in errors or logs.
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/#]+)(?:\?.*)?$/.exec(uri);
  if (!match) throw new Error('MongoDB URI requires an explicit database name');
  return decodeURIComponent(match[1]);
}
export function assertDevelopmentSeed() {
  if (env.NODE_ENV === 'production')
    throw new Error('Sample seeds are forbidden in production');
}
