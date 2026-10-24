import { test, expect, signIn, assertNoOverflow } from './helpers.js';
test('student sees selection history after archive; other students cannot open it', async ({
  page,
  browser,
}) => {
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Applications', exact: true }).click();
  let applicationId;
  const review = async (status) => {
    const row = page.getByRole('row').filter({
      has: page.getByRole('link', {
        name: `#${applicationId} · History`,
        exact: true,
      }),
    });
    await row
      .getByRole('button', { name: 'Update status', exact: true })
      .click();
    await page.getByLabel('New application status').selectOption(status);
    await page
      .getByLabel('Remarks (visible to student)')
      .fill('Example official selection result.');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(
      row.getByRole('cell', { name: status, exact: true }),
    ).toBeVisible();
  };
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 900 },
  });
  const student = await context.newPage();
  try {
    await signIn(student);
    await student.goto('/student/drives/2');
    await student.getByRole('button', { name: 'Apply to this drive' }).click();
    await student.getByRole('button', { name: 'Confirm' }).click();
    await expect(student).toHaveURL(/\/student\/applications\/\d+$/);
    applicationId = /\/applications\/(\d+)/.exec(student.url())[1];
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await review('shortlisted');
    await review('selected');
    await student
      .getByRole('link', { name: 'My applications', exact: true })
      .click();
    await student
      .getByRole('link', { name: `#${applicationId} · History`, exact: true })
      .click();
    await student
      .getByRole('button', { name: 'Refresh application', exact: true })
      .click();
    await expect(
      student.getByText('shortlisted → selected', { exact: true }),
    ).toBeVisible();
    await expect(
      student.getByRole('button', { name: 'Withdraw application' }),
    ).toHaveCount(0);
    await page.goto('/admin/drives/2');
    for (const status of ['completed', 'archived']) {
      await page.getByLabel('Change drive status').selectOption(status);
      await page
        .getByRole('button', { name: 'Update status', exact: true })
        .click();
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect(
        page.locator('span').filter({ hasText: new RegExp(`^${status}$`) }),
      ).toBeVisible();
    }
    await student
      .getByRole('button', { name: 'Refresh application', exact: true })
      .click();
    await expect(
      student.getByText(
        'This drive is archived. Your application and history remain available here.',
      ),
    ).toBeVisible();
    await expect(
      student.getByRole('link', { name: 'View placement drive →' }),
    ).toHaveCount(0);
    await assertNoOverflow(student);
    await student.screenshot({
      path: 'test-results/student-application-history-375.png',
      fullPage: true,
    });
    await student.getByRole('button', { name: 'Sign out' }).click();
    await expect(
      student.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    await student
      .getByLabel('Email', { exact: true })
      .fill('concurrent-test@example.edu');
    await student
      .getByLabel('Password', { exact: true })
      .fill('test-only-browser-password');
    await student.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      student.getByRole('heading', { name: 'Student dashboard' }),
    ).toBeVisible();
    await student.goto(`/student/applications/${applicationId}`);
    await expect(student.getByRole('alert')).toContainText('Record not found');
    await expect(
      student.getByRole('heading', { name: 'Status history' }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
