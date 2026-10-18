import { getAdminInput } from '../src/config/authConfig.js';
import { createMysqlPool } from '../src/config/mysqlPool.js';
import { adminBody } from '../src/validators/authValidator.js';
import { authRepository } from '../src/repositories/authRepository.js';
import { authService } from '../src/services/authService.js';
import { logger } from '../src/config/logger.js';
const input = adminBody.safeParse(getAdminInput());
if (!input.success) {
  logger.error(
    'Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD securely for administrator provisioning',
  );
  process.exitCode = 1;
} else {
  const pool = createMysqlPool();
  try {
    const user = await authService(authRepository(pool)).provisionAdmin(
      input.data,
    );
    logger.info(
      { userId: user.id },
      'Administrator provisioned through operator CLI',
    );
  } catch {
    logger.error(
      'Administrator provisioning failed; check database configuration and duplicate accounts',
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
