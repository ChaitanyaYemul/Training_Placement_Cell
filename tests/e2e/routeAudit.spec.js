import { test, expect, signIn, assertNoOverflow } from './helpers.js';

const studentRoutes = [
  ['dashboard', 'Student dashboard'],
  ['profile', 'My profile'],
  ['companies', 'Companies'],
  ['companies/1', 'Example Campus Labs'],
  ['drives', 'Placement drives'],
  ['drives/1', 'Example Test Drive'],
  ['drives/1/timeline', 'Example Test Drive'],
  ['applications', 'My applications'],
  ['applications/1', 'Application #1'],
  ['announcements', 'Announcements'],
];
const adminRoutes = [
  ['dashboard', 'Admin dashboard'],
  ['companies', 'Companies'],
  ['companies/1', 'Example Campus Labs'],
  ['companies/new', 'Create company'],
  ['companies/1/edit', 'Edit company'],
  ['companies/1/job-postings/new', 'Create job posting'],
  ['job-postings/1/edit', 'Edit job posting'],
  ['drives', 'Placement drives'],
  ['drives/1', 'Example Test Drive'],
  ['drives/new', 'Create placement drive'],
  ['drives/1/edit', 'Edit placement drive'],
  ['drives/1/rounds', 'Rounds & schedule'],
  ['drives/1/schedule', 'Rounds & schedule'],
  ['applications', 'Applications'],
  ['applications/1', 'Application #1'],
  ['announcements', 'Announcements'],
  ['reports', 'Placement reports'],
];

async function reserveRequests(request) {
  const response = await request.get('/api/health');
  const header = response.headers().ratelimit || '';
  const remaining = Number(/r=(\d+)/.exec(header)?.[1] ?? 120);
  if (response.status() === 429 || remaining < 35) {
    const seconds = Number(
      response.headers()['retry-after'] || /t=(\d+)/.exec(header)?.[1] || 60,
    );
    // Exercise the real limiter without bypassing middleware or raising its limit.
    await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
  }
}

for (const width of [375, 768, 1280]) {
  for (const role of ['student', 'admin']) {
    test(`${role} route and accessibility audit at ${width}px`, async ({
      page,
      request,
    }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, role);
      const consoleErrors = [];
      const apiFailures = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('response', (response) => {
        if (response.url().includes('/api/') && response.status() >= 400)
          apiFailures.push(`${response.status()} ${response.url()}`);
      });
      const routes = role === 'student' ? studentRoutes : adminRoutes;
      for (const [path, title] of routes) {
        await reserveRequests(request);
        // Direct navigation verifies deployment deep links as well as SPA routes.
        await page.goto(`/${role}/${path}`);
        await expect(
          page.getByRole('heading', { level: 1, name: title, exact: true }),
        ).toBeVisible();
        await expect(page.getByText('Loading…', { exact: true })).toHaveCount(
          0,
        );
        await expect(page.getByRole('alert')).toHaveCount(0);
        await assertNoOverflow(page);
        const missingLabels = await page.locator('main').evaluate((main) =>
          Array.from(main.querySelectorAll('input, select, textarea'))
            .filter((element) => element.type !== 'hidden')
            .filter(
              (element) =>
                !element.labels?.length &&
                !element.getAttribute('aria-label') &&
                !element.getAttribute('aria-labelledby'),
            )
            .map((element) => element.outerHTML),
        );
        expect(missingLabels, `Unlabelled fields on ${path}`).toEqual([]);
      }
      await page.evaluate(() => {
        window.__routeAuditMarker = 'same-document';
      });
      await page
        .getByRole('navigation', { name: `${role} navigation` })
        .getByRole('link', { name: 'Dashboard', exact: true })
        .click();
      await expect(page).toHaveURL(`/${role}/dashboard`);
      expect(await page.evaluate(() => window.__routeAuditMarker)).toBe(
        'same-document',
      );
      expect(apiFailures).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }
}

test('skip link and results table support keyboard focus on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await signIn(page);
  await page.goto('/student/companies');
  await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const table = page.getByRole('region', { name: 'Company results' });
  await table.focus();
  await expect(table).toBeFocused();
});
