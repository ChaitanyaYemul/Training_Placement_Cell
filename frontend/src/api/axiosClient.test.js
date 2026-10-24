import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { axiosClient, resetSession } from './axiosClient.js';
import { login, logout } from './authApi.js';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSession();
});
afterAll(() => server.close());
it('preserves pagination and degraded-read warnings, and handles 204', async () => {
  server.use(
    http.get('*/api/companies', () =>
      HttpResponse.json({ success: true, data: [], meta: { total: 22 } }),
    ),
    http.get('*/api/placement-drives/1', () =>
      HttpResponse.json({
        success: true,
        data: { id: 1, recruitment: null },
        warnings: [{ code: 'RECRUITMENT_DATA_UNAVAILABLE' }],
      }),
    ),
  );
  expect((await axiosClient.get('/companies')).meta.total).toBe(22);
  expect((await axiosClient.get('/placement-drives/1')).warnings[0].code).toBe(
    'RECRUITMENT_DATA_UNAVAILABLE',
  );
});
it('bootstraps CSRF once for concurrent writes and uses the rotated login token', async () => {
  let tokens = 0;
  const seen = [];
  server.use(
    http.get('*/api/auth/csrf-token', () => {
      tokens++;
      return HttpResponse.json({ data: { csrfToken: 'before' } });
    }),
    http.post('*/api/auth/login', ({ request }) => {
      seen.push(request.headers.get('X-CSRF-Token'));
      return HttpResponse.json({
        data: { user: { id: 1, role: 'student' }, csrfToken: 'after' },
      });
    }),
    http.post('*/api/auth/logout', ({ request }) => {
      seen.push(request.headers.get('X-CSRF-Token'));
      return new HttpResponse(null, { status: 204 });
    }),
  );
  await Promise.all([
    axiosClient.post('/auth/login', {}),
    axiosClient.post('/auth/login', {}),
  ]);
  expect(tokens).toBe(1);
  await login({ email: 'fake@example.edu', password: 'fake-password' });
  await logout();
  expect(seen).toEqual(['before', 'before', 'before', 'after']);
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});
it('does not replay failed writes; retains field errors and recovers CSRF on the next explicit attempt', async () => {
  let writes = 0,
    tokens = 0;
  server.use(
    http.get('*/api/auth/csrf-token', () => {
      tokens++;
      return HttpResponse.json({ data: { csrfToken: 'token' } });
    }),
    http.patch('*/api/students/me', () => {
      writes++;
      return HttpResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Invalid CSRF',
            details: [{ field: 'body.fullName', message: 'Invalid' }],
          },
        },
        { status: 403 },
      );
    }),
  );
  await expect(axiosClient.patch('/students/me', {})).rejects.toMatchObject({
    status: 403,
    details: [{ field: 'body.fullName', message: 'Invalid' }],
  });
  expect(writes).toBe(1);
  await expect(axiosClient.patch('/students/me', {})).rejects.toMatchObject({
    status: 403,
  });
  expect(tokens).toBe(2);
});
it('rejects responses from a previous session generation', async () => {
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  server.use(
    http.get('*/api/students/me', async () => {
      started();
      await delay(40);
      return HttpResponse.json({ data: { fullName: 'Previous user' } });
    }),
  );
  const result = axiosClient.get('/students/me');
  await ready;
  resetSession();
  await expect(result).rejects.toMatchObject({ code: 'ERR_CANCELED' });
});
it('does not send a pending write after the session changes during CSRF bootstrap', async () => {
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  let writes = 0;
  server.use(
    http.get('*/api/auth/csrf-token', async () => {
      started();
      await delay(40);
      return HttpResponse.json({ data: { csrfToken: 'old-token' } });
    }),
    http.patch('*/api/students/me', () => {
      writes++;
      return HttpResponse.json({ data: {} });
    }),
  );
  const request = axiosClient.patch('/students/me', {});
  await ready;
  resetSession();
  await expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  expect(writes).toBe(0);
});
