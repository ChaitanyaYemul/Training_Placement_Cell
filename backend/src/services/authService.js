import { hashPassword, verifyPassword } from './passwordService.js';
import { AppError } from '../utils/AppError.js';
export function authService(repository) {
  // Same verification work for nonexistent accounts; never log credentials or hashes.
  const dummy = hashPassword('non-login-dummy-verification-value');
  const publicUser = ({ id, email, role, studentId, adminId }) => ({
    id,
    email,
    role,
    studentId,
    adminId,
  });
  return {
    async register(input) {
      return repository.create(
        { ...input, passwordHash: await hashPassword(input.password) },
        'student',
      );
    },
    async provisionAdmin(input) {
      return repository.create(
        { ...input, passwordHash: await hashPassword(input.password) },
        'admin',
      );
    },
    async login({ email, password }) {
      const user = await repository.credentials(email);
      const valid = await verifyPassword(
        user?.passwordHash || (await dummy),
        password,
      );
      if (!valid || !user?.isActive)
        throw new AppError('UNAUTHENTICATED', 401, 'Invalid email or password');
      await repository.recordLogin(user.id);
      return publicUser(await repository.user(user.id));
    },
    async current(id) {
      const user = await repository.user(id);
      if (!user?.isActive)
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required');
      return publicUser(user);
    },
  };
}
