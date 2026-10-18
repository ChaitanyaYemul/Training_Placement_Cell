import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  describe,
  it,
  expect,
} from 'vitest';
import { spawnSync } from 'node:child_process';
import request from 'supertest';
import { freshMysql } from '../db/helpers.js';
import { createApp } from '../../backend/src/app.js';
import { getAuthSettings } from '../../backend/src/config/authConfig.js';
import { authRepository } from '../../backend/src/repositories/authRepository.js';
import { authService } from '../../backend/src/services/authService.js';
import {
  hashPassword,
  verifyPassword,
} from '../../backend/src/services/passwordService.js';
import {
  requireAuth,
  requireRole,
} from '../../backend/src/middleware/authorization.js';
let pool,
  app,
  agent,
  csrf,
  index = 0;
const origin = 'http://localhost:5173';
const userInput = () => ({
  email: `auth${++index}@example.edu`,
  password: 'test-only-password',
  fullName: 'Example Test Student',
});
beforeAll(async () => {
  ({ pool } = await freshMysql());
});
beforeEach(async () => {
  app = createApp({
    pool,
    security: getAuthSettings(),
    mountBusiness: (app, service) => {
      app.get(
        '/api/test/admin',
        requireAuth(service),
        requireRole('admin'),
        (_req, res) => res.json({ success: true }),
      );
    },
  });
  agent = request.agent(app);
  csrf = (await agent.get('/api/auth/csrf-token')).body.data.csrfToken;
});
afterEach(async () => {
  await app.locals.closeSessions();
});
afterAll(async () => {
  if (pool) await pool.end();
});
function post(path, body, token = csrf) {
  return agent
    .post('/api/auth/' + path)
    .set('Origin', origin)
    .set('X-CSRF-Token', token)
    .send(body);
}
describe('Independent authentication commit: real MySQL sessions', () => {
  it('hashes with Argon2id and verifies without storing plaintext', async () => {
    const hash = await hashPassword('test-only-password');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, 'test-only-password')).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });
  it('registers student + profile transactionally and ignores a supplied admin role (BR-17)', async () => {
    const input = userInput();
    const response = await post('register', { ...input, role: 'admin' });
    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe('student');
    const user = await authRepository(pool).user(response.body.data.id);
    expect(user.studentId).toBeTruthy();
    expect(user.adminId).toBeNull();
    const credentials = await authRepository(pool).credentials(input.email);
    expect(credentials.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(response.body)).not.toContain(input.password);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });
  it('rejects duplicate registration without leaving another student profile', async () => {
    const input = userInput();
    expect((await post('register', input)).status).toBe(201);
    expect((await post('register', input)).status).toBe(409);
    const [[row]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM students AS s JOIN users AS u ON u.id = s.user_id WHERE u.email = ?',
      [input.email],
    );
    expect(row.total).toBe(1);
  });
  it('rejects invalid/unknown fields and operator injection', async () => {
    for (const body of [
      { ...userInput(), extra: true },
      { ...userInput(), email: { $gt: '' } },
      { ...userInput(), password: 'short' },
    ])
      expect((await post('register', body)).status).toBe(400);
  });
  it('requires matching session CSRF and an allowlisted Origin on auth writes', async () => {
    expect(
      (await agent.post('/api/auth/register').send(userInput())).status,
    ).toBe(403);
    expect((await post('register', userInput(), 'wrong')).status).toBe(403);
    expect(
      (
        await agent
          .post('/api/auth/register')
          .set('Origin', 'https://evil.example')
          .set('X-CSRF-Token', csrf)
          .send(userInput())
      ).status,
    ).toBe(403);
    expect((await post('register', userInput(), 'é'.repeat(43))).status).toBe(
      403,
    );
  });
  it('regenerates the login session, invalidates the old session and returns only safe user data', async () => {
    const input = userInput();
    await post('register', input);
    const oldCookie = (await agent.get('/api/auth/csrf-token')).headers[
      'set-cookie'
    ][0].split(';')[0];
    const login = await post('login', {
      email: input.email,
      password: input.password,
    });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie'][0]).not.toContain(oldCookie);
    expect(login.body.data.csrfToken).not.toBe(csrf);
    expect((await agent.get('/api/auth/me')).body.data.email).toBe(input.email);
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', oldCookie)).status,
    ).toBe(401);
    const [[row]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM app_sessions WHERE data LIKE ?',
      ['%"userId":' + login.body.data.user.id + ',%'],
    );
    expect(row.total).toBe(1);
    expect(login.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(login.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
  });
  it('uses generic login errors for nonexistent users, bad passwords and inactive accounts', async () => {
    const input = userInput();
    await post('register', input);
    const wrong = await post('login', {
      email: input.email,
      password: 'wrong-password',
    });
    const absent = await post('login', {
      email: userInput().email,
      password: input.password,
    });
    expect(wrong.status).toBe(401);
    expect(absent.body).toEqual(wrong.body);
    await pool.execute('UPDATE users SET is_active = 0 WHERE email = ?', [
      input.email,
    ]);
    const inactive = await post('login', {
      email: input.email,
      password: input.password,
    });
    expect(inactive.body).toEqual(wrong.body);
  });
  it('revokes access when an authenticated account becomes inactive', async () => {
    const input = userInput();
    await post('register', input);
    await post('login', { email: input.email, password: input.password });
    await pool.execute('UPDATE users SET is_active = 0 WHERE email = ?', [
      input.email,
    ]);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
  it('expires sessions in the persistent store and rejects anonymous requests', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const input = userInput();
    await post('register', input);
    const result = await post('login', {
      email: input.email,
      password: input.password,
    });
    await pool.execute(
      'UPDATE app_sessions SET expires = 0 WHERE data LIKE ?',
      ['%"userId":' + result.body.data.user.id + ',%'],
    );
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
  it('logs out, destroys the stored session and clears the cookie', async () => {
    const input = userInput();
    await post('register', input);
    const result = await post('login', {
      email: input.email,
      password: input.password,
    });
    const response = await post('logout', {}, result.body.data.csrfToken);
    expect(response.status).toBe(204);
    expect(response.headers['set-cookie'][0]).toMatch(
      /Expires=Thu, 01 Jan 1970/,
    );
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
  it('enforces roles from authoritative user data and supports administrator login', async () => {
    const input = userInput();
    await post('register', input);
    await post('login', { email: input.email, password: input.password });
    expect((await agent.get('/api/test/admin')).status).toBe(403);
    const admin = { ...userInput(), fullName: 'Example Administrator' };
    await authService(authRepository(pool)).provisionAdmin(admin);
    const token = (await agent.get('/api/auth/csrf-token')).body.data.csrfToken;
    const login = await post(
      'login',
      { email: admin.email, password: admin.password },
      token,
    );
    expect(login.body.data.user.role).toBe('admin');
    expect((await agent.get('/api/test/admin')).status).toBe(200);
    expect(
      (
        await post(
          'register',
          { ...userInput(), role: 'admin' },
          login.body.data.csrfToken,
        )
      ).body.data.role,
    ).toBe('student');
  });
  it('rate limits repeated authentication requests', async () => {
    const failed = { email: userInput().email, password: 'incorrect-password' };
    for (let i = 0; i < 10; i++)
      expect((await post('login', failed)).status).toBe(401);
    expect((await post('login', failed)).status).toBe(429);
  });
  it('provisions an admin only through the operator CLI and fails without credentials', async () => {
    const input = userInput();
    const result = spawnSync(
      process.execPath,
      ['--env-file=.env.test', 'scripts/createAdmin.js'],
      {
        cwd: new URL('../../backend/', import.meta.url),
        env: {
          ADMIN_EMAIL: input.email,
          ADMIN_PASSWORD: input.password,
          ADMIN_NAME: 'CLI Test Administrator',
        },
        encoding: 'utf8',
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(input.email);
    expect(result.stdout).not.toContain(input.password);
    expect((await authRepository(pool).credentials(input.email)).role).toBe(
      'admin',
    );
    const missing = spawnSync(process.execPath, ['scripts/createAdmin.js'], {
      cwd: new URL('../../backend/', import.meta.url),
      env: {},
      encoding: 'utf8',
    });
    expect(missing.status).toBe(1);
  });
  it('sets Secure cookies behind explicitly trusted HTTPS termination', async () => {
    const secureApp = createApp({
      pool,
      security: { ...getAuthSettings(), secure: true, TRUST_PROXY_HOPS: 1 },
    });
    try {
      const response = await request(secureApp)
        .get('/api/auth/csrf-token')
        .set('X-Forwarded-Proto', 'https');
      expect(response.headers['set-cookie'][0]).toMatch(/; Secure/);
    } finally {
      await secureApp.locals.closeSessions();
    }
  });
});
