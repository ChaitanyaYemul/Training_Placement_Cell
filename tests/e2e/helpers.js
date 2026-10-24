import { test as base, expect } from '@playwright/test';
// Preserve the real shared rate limiter: wait for its window when this suite needs capacity.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    expect(errors).toEqual([]);
  },
  capacity: [
    async ({ request }, use) => {
      const response = await request.get('/api/health');
      const header = response.headers().ratelimit || '';
      const remaining = /r=(\d+)/.exec(header);
      const reset = /t=(\d+)/.exec(header);
      if (
        response.status() === 429 ||
        (remaining && Number(remaining[1]) < 65)
      ) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            (Number(response.headers()['retry-after'] || reset?.[1] || 60) +
              1) *
              1000,
          ),
        );
      }
      await use();
    },
    { auto: true },
  ],
});
export { expect };
export async function signIn(page, role = 'student') {
  await page.goto('/login');
  await page
    .getByLabel('Email', { exact: true })
    .fill(
      role === 'admin' ? 'admin-test@example.edu' : 'student-test@example.edu',
    );
  await page
    .getByLabel('Password', { exact: true })
    .fill('test-only-browser-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: role === 'admin' ? 'Admin dashboard' : 'Student dashboard',
    }),
  ).toBeVisible();
}
export async function assertNoOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
