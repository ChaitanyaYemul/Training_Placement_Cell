import { withTransaction } from './transaction.js';
export function authRepository(pool) {
  return {
    async credentials(email) {
      const [[row]] = await pool.execute(
        'SELECT id, email, password_hash AS passwordHash, role, is_active AS isActive FROM users WHERE email = ?',
        [email],
      );
      return row;
    },
    async user(id) {
      const [[row]] = await pool.execute(
        `SELECT u.id, u.email, u.role, u.is_active AS isActive,
        s.id AS studentId, a.id AS adminId FROM users AS u
        LEFT JOIN students AS s ON s.user_id = u.id LEFT JOIN admins AS a ON a.user_id = u.id WHERE u.id = ?`,
        [id],
      );
      return row;
    },
    async create({ email, passwordHash, fullName }, role) {
      return withTransaction(pool, async (tx) => {
        const [result] = await tx.execute(
          'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
          [email, passwordHash, role],
        );
        if (role === 'student')
          await tx.execute(
            'INSERT INTO students (user_id, full_name) VALUES (?, ?)',
            [result.insertId, fullName || null],
          );
        else
          await tx.execute(
            'INSERT INTO admins (user_id, full_name) VALUES (?, ?)',
            [result.insertId, fullName],
          );
        return { id: result.insertId, email, role };
      });
    },
    async recordLogin(id) {
      await pool.execute(
        'UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?',
        [id],
      );
    },
  };
}
