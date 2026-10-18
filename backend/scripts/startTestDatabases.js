import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import {
  localTestSettings,
  TEST_IMAGES,
} from '../src/config/localTestDatabases.js';
import { createMysqlPool } from '../src/config/mysqlPool.js';
import { connectMongo } from '../src/config/mongoConnection.js';
import {
  checkMysql,
  checkMongo,
} from '../src/repositories/databaseHealthRepository.js';
import { logger } from '../src/config/logger.js';
function docker(args) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
function startContainer(name, image, args, containerPort, hostPort) {
  const names = docker(['ps', '-a', '--format', '{{.Names}}']).split('\n');
  if (names.includes(name)) {
    const existingImage = docker([
      'inspect',
      '--format',
      '{{.Config.Image}}',
      name,
    ]);
    if (![image, image.split('@')[0]].includes(existingImage))
      throw new Error(
        'Existing container image differs; preserved without changes',
      );
    const bindings = JSON.parse(
      docker([
        'inspect',
        '--format',
        '{{json .HostConfig.PortBindings}}',
        name,
      ]),
    );
    const binding = bindings?.[`${containerPort}/tcp`];
    if (
      !binding ||
      binding.length !== 1 ||
      binding[0].HostIp !== '127.0.0.1' ||
      binding[0].HostPort !== String(hostPort)
    )
      throw new Error(
        'Existing container ports differ; preserved without changes',
      );
    docker(['start', name]);
  } else {
    docker(['pull', image]);
    docker([
      'run',
      '--detach',
      '--name',
      name,
      '-p',
      `127.0.0.1:${hostPort}:${containerPort}`,
      ...args,
      image,
    ]);
  }
}
let pool, connection, temporaryDirectory;
try {
  const settings = await localTestSettings();
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'placement-test-db-'));
  const secretFile = join(temporaryDirectory, 'mysql.env');
  await writeFile(
    secretFile,
    `MYSQL_ROOT_PASSWORD=${settings.MYSQL_PASSWORD}\nMYSQL_DATABASE=${settings.MYSQL_DATABASE}\n`,
    { mode: 0o600 },
  );
  startContainer(
    'placement-phase2-mysql',
    TEST_IMAGES.mysql,
    ['--env-file', secretFile],
    3306,
    settings.mysqlPort,
  );
  startContainer(
    'placement-phase2-mongo',
    TEST_IMAGES.mongo,
    [],
    27017,
    settings.mongoPort,
  );
  pool = createMysqlPool(settings);
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      connection = await connectMongo(settings);
      const mysql = await checkMysql(pool);
      const mongodb = await checkMongo(connection);
      logger.info(
        { mysql, mongodb },
        'Local test databases are ready; credentials remain in ignored .env.test',
      );
      break;
    } catch {
      if (connection) {
        await connection.close();
        connection = undefined;
      }
      if (attempt === 44) throw new Error('Database readiness timeout');
      await setTimeout(1000);
    }
  }
} catch {
  logger.error(
    'Local test database startup failed; check Docker, existing container ports, and the preserved .env.test configuration',
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
  if (pool) await pool.end();
  if (temporaryDirectory)
    await rm(temporaryDirectory, { recursive: true, force: true });
}
