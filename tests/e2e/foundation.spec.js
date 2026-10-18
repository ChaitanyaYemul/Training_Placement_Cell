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
