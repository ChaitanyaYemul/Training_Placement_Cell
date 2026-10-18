import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { assertTestDatabase } from './databaseEnv.js';
const testEnvPath = new URL('../../.env.test', import.meta.url);
export const TEST_IMAGES = {
  mysql:
    'mysql:8.4@sha256:24989179f58856db763f418010c1169fecc944e3ec1ea7e921572d83eb070f70',
  mongo:
    'mongo:8.0@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907',
};
export async function localTestSettings() {
  try {
    await writeFile(
      testEnvPath,
      `NODE_ENV=test\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nCSRF_SECRET=${randomBytes(32).toString('hex')}\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=3307\nMYSQL_USER=root\nMYSQL_PASSWORD=${randomBytes(32).toString('hex')}\nMYSQL_DATABASE=placement_test\nMONGODB_URI=mongodb://127.0.0.1:27018/placement_test\n`,
      { flag: 'wx', mode: 0o600 },
    );
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const settings = parseEnv(await readFile(testEnvPath, 'utf8'));
  assertTestDatabase(settings.MYSQL_DATABASE);
  const mongoMatch =
    /^mongodb:\/\/127\.0\.0\.1:(\d+)\/([A-Za-z0-9_]+_test)$/.exec(
      settings.MONGODB_URI || '',
    );
  if (
    !mongoMatch ||
    settings.MYSQL_HOST !== '127.0.0.1' ||
    settings.MYSQL_USER !== 'root' ||
    !settings.MYSQL_PASSWORD ||
    settings.NODE_ENV !== 'test'
  )
    throw new Error(
      'Container helper requires local, disposable test settings; existing configuration was preserved',
    );
  assertTestDatabase(mongoMatch[2]);
  const mysqlPort = Number(settings.MYSQL_PORT),
    mongoPort = Number(mongoMatch[1]);
  if (
    ![mysqlPort, mongoPort].every(
      (port) => Number.isInteger(port) && port > 0 && port <= 65535,
    )
  )
    throw new Error('Invalid local test port');
  for (const key of ['SESSION_SECRET', 'CSRF_SECRET']) {
    if (settings[key] === undefined) {
      settings[key] = randomBytes(32).toString('hex');
      await appendFile(testEnvPath, `\n${key}=${settings[key]}\n`);
    }
  }
  return { ...settings, mysqlPort, mongoPort };
}
