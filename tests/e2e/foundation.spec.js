import { test, expect } from '@playwright/test';
for (const width of [375, 1280]) {
  test(`foundation navigation and live API at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'From campus.',
    );
    await expect(
      page.getByText('API connected', { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      window.__navigationMarker = 'same-document';
    });
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Student', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Student workspace', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.__navigationMarker)).toBe(
      'same-document',
    );
    await expect(
      page.getByText(/This is not an authenticated dashboard/),
    ).toBeVisible();
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Admin', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Admin workspace', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Admin workspace', exact: true }),
    ).toBeVisible();
    await page.goto('/missing');
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('real browser authenticates through the Vite proxy without exposing a session id', async ({
  page,
}) => {
  await page.goto('http://localhost:5173');
  const statuses = await page.evaluate(async () => {
    const read = async (path) =>
      await fetch('/api' + path, { credentials: 'include' });
    const initial = await (await read('/auth/csrf-token')).json();
    const input = {
      email: `browser-${Date.now()}@example.edu`,
      password: 'test-only-browser-password',
      fullName: 'Example Browser Student',
      role: 'admin',
    };
    const write = async (path, body, token, method = 'POST') =>
      fetch('/api' + path, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify(body),
      });
    const registration = await write(
      '/auth/register',
      input,
      initial.data.csrfToken,
    );
    const registered = await registration.json();
    const login = await write(
      '/auth/login',
      { email: input.email, password: input.password },
      initial.data.csrfToken,
    );
    const loggedIn = await login.json();
    const me = await read('/auth/me');
    const profile = await write(
      '/students/me',
      { fullName: 'Example Browser Profile' },
      loggedIn.data.csrfToken,
      'PATCH',
    );
    const forbidden = await write(
      '/companies',
      { name: 'Must not be created' },
      loggedIn.data.csrfToken,
    );
    const logout = await write('/auth/logout', {}, loggedIn.data.csrfToken);
    const anonymous = await read('/auth/me');
    return {
      register: registration.status,
      role: registered.data.role,
      login: login.status,
      me: me.status,
      profile: profile.status,
      forbidden: forbidden.status,
      logout: logout.status,
      anonymous: anonymous.status,
      hasSessionId: Object.hasOwn(loggedIn.data, 'sessionId'),
    };
  });
  expect(statuses).toEqual({
    register: 201,
    role: 'student',
    login: 200,
    me: 200,
    profile: 200,
    forbidden: 403,
    logout: 204,
    anonymous: 401,
    hasSessionId: false,
  });
});
