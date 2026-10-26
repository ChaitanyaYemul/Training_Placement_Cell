import { expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { pool } from './helpers.js';
import { authRepository } from '../../backend/src/repositories/authRepository.js';
import { demoRepository } from '../../backend/src/repositories/demoRepository.js';
import { authService } from '../../backend/src/services/authService.js';
import { demoProvisioningService } from '../../backend/src/services/demoProvisioningService.js';

function setup(suffix) {
  const accounts = authRepository(pool);
  const authentication = authService(accounts);
  const service = demoProvisioningService({
    repository: demoRepository(pool),
    authentication,
    accounts,
  });
  const credentials = {
    version: 1,
    mysqlDatabase: 'isolated_demo',
    mongoDatabase: 'isolated_demo',
    admin: {
      email: `demo-admin-${suffix}@example.edu`,
      fullName: 'Demo Administrator',
      password: randomBytes(24).toString('base64url'),
    },
    student: {
      email: `demo-student-${suffix}@example.edu`,
      fullName: 'Demo Student',
      password: randomBytes(24).toString('base64url'),
    },
  };
  return { service, credentials, authentication, accounts };
}

it('creates usable admin/student credentials and reruns without resetting account data', async () => {
  const { service, credentials, authentication, accounts } = setup('repeat');
  const first = await service.provision(credentials);
  expect(first.map((account) => account.created)).toEqual([true, true]);
  const student = await authentication.login(credentials.student);
  expect(student.role).toBe('student');
  expect((await authentication.login(credentials.admin)).role).toBe('admin');
  const before = await accounts.credentials(credentials.student.email);
  await pool.execute('UPDATE students SET full_name = ? WHERE user_id = ?', [
    'Edited demonstration name',
    student.id,
  ]);
  const second = await service.provision(credentials);
  expect(second).toEqual(
    first.map((account) => ({ ...account, created: false })),
  );
  expect(
    (await accounts.credentials(credentials.student.email)).passwordHash,
  ).toBe(before.passwordHash);
  const [[profile]] = await pool.execute(
    'SELECT full_name AS fullName FROM students WHERE user_id = ?',
    [student.id],
  );
  expect(profile.fullName).toBe('Edited demonstration name');
});

it('refuses mismatched saved passwords without overwriting existing credentials', async () => {
  const { service, credentials, authentication } = setup('mismatch');
  await service.provision(credentials);
  await expect(
    service.provision({
      ...credentials,
      admin: {
        ...credentials.admin,
        password: randomBytes(24).toString('base64url'),
      },
    }),
  ).rejects.toThrow('does not match');
  expect((await authentication.login(credentials.admin)).role).toBe('admin');
});

it('serializes concurrent provisioning and creates each account once', async () => {
  const { service, credentials } = setup('concurrent');
  const results = await Promise.all([
    service.provision(credentials),
    service.provision(credentials),
  ]);
  expect(results.flat().filter((account) => account.created)).toHaveLength(2);
  expect(new Set(results.flat().map((account) => account.userId)).size).toBe(2);
});
