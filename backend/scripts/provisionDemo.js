import { randomBytes } from 'node:crypto';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { getDemoSettings } from '../src/config/demoConfig.js';
import { createMysqlPool } from '../src/config/mysqlPool.js';
import { logger } from '../src/config/logger.js';
import { authRepository } from '../src/repositories/authRepository.js';
import { demoRepository } from '../src/repositories/demoRepository.js';
import { authService } from '../src/services/authService.js';
import {
  demoCredentialsSchema,
  demoProvisioningService,
} from '../src/services/demoProvisioningService.js';

// This file is ignored by .env.* and is never emitted to logs.
const credentialsFile = new URL(
  '../.env.demo-credentials.json',
  import.meta.url,
);
let pool;
try {
  const target = getDemoSettings();
  if (process.argv.length > 2)
    throw new Error('Demo provisioning accepts no command-line credentials');
  let credentials;
  try {
    const info = await lstat(credentialsFile);
    if (!info.isFile() || (info.mode & 0o077) !== 0)
      throw new Error(
        'Demo credentials must be a regular private file (mode 0600)',
      );
    credentials = demoCredentialsSchema.parse(
      JSON.parse(await readFile(credentialsFile, 'utf8')),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    credentials = {
      version: 1,
      ...target,
      admin: {
        email: 'demo-admin@example.edu',
        fullName: 'Demo Placement Administrator',
        password: randomBytes(24).toString('base64url'),
      },
      student: {
        email: 'demo-student@example.edu',
        fullName: 'Demo Student',
        password: randomBytes(24).toString('base64url'),
      },
    };
    await writeFile(
      credentialsFile,
      JSON.stringify(credentials, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
  }
  if (
    credentials.mysqlDatabase !== target.mysqlDatabase ||
    credentials.mongoDatabase !== target.mongoDatabase
  )
    throw new Error(
      'Saved demo credentials belong to another database; use a separate checkout for another demo',
    );
  pool = createMysqlPool();
  const accounts = authRepository(pool);
  const results = await demoProvisioningService({
    repository: demoRepository(pool),
    authentication: authService(accounts),
    accounts,
  }).provision(credentials);
  logger.info(
    { accounts: results },
    'Demo accounts ready; credentials are in backend/.env.demo-credentials.json',
  );
} catch {
  logger.error(
    'Demo provisioning failed; verify development mode, matching _demo databases, applied migrations and private saved credentials. Existing accounts and passwords are never replaced.',
  );
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
