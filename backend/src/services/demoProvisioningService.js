import { z } from 'zod';
import { adminBody } from '../validators/authValidator.js';
import { verifyPassword } from './passwordService.js';

export const demoCredentialsSchema = z
  .object({
    version: z.literal(1),
    mysqlDatabase: z.string().regex(/^[A-Za-z0-9_]+_demo$/),
    mongoDatabase: z.string().regex(/^[A-Za-z0-9_]+_demo$/),
    admin: adminBody,
    student: adminBody,
  })
  .strict();

/** Create only missing demo accounts; never reset an existing password or profile. */
export function demoProvisioningService({
  repository,
  authentication,
  accounts,
}) {
  return {
    async provision(credentials) {
      const input = demoCredentialsSchema.parse(credentials);
      if (
        input.mysqlDatabase !== input.mongoDatabase ||
        input.admin.email === input.student.email
      )
        throw new Error('Invalid demo credential targets');
      return repository.withProvisioningLock(async () => {
        const results = [];
        for (const role of ['admin', 'student']) {
          const account = input[role];
          const existing = await accounts.credentials(account.email);
          if (existing) {
            if (
              existing.role !== role ||
              !existing.isActive ||
              !(await verifyPassword(existing.passwordHash, account.password))
            )
              throw new Error(
                'Existing demo account does not match the saved credentials; no account was overwritten',
              );
            results.push({ role, userId: existing.id, created: false });
          } else {
            const user =
              role === 'admin'
                ? await authentication.provisionAdmin(account)
                : await authentication.register(account);
            results.push({ role, userId: user.id, created: true });
          }
        }
        return results;
      });
    },
  };
}
