import { test, expect, signIn, assertNoOverflow } from './helpers.js';

async function csvDownload(page, label) {
  const started = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const download = await started;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString('utf8');
  return { filename: download.suggestedFilename(), content };
}

test('admin filters every report and downloads real CSV exports without reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Placement reports' }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__reportMarker = 'same-document';
  });
  await page.getByLabel('Deadline from (UTC)').fill('2030-11-01');
  await page.getByLabel('Deadline to (UTC)').fill('2030-11-01');
  await page.getByLabel('Branch', { exact: true }).selectOption('1');
  await page.getByLabel('Companies', { exact: true }).selectOption('1');
  await page.getByLabel('Drives', { exact: true }).selectOption('1');
  await expect(page.getByText('Loading…', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Drive results table' }),
  ).toContainText('Example Test Drive');

  const overview = await csvDownload(page, 'Export overview CSV');
  expect(overview.filename).toBe('placement-overview.csv');
  expect(overview.content).toContain('placedStudents');
  for (const report of [
    'drives',
    'companies',
    'branches',
    'statuses',
    'participation',
  ]) {
    await page.getByLabel('Report', { exact: true }).selectOption(report);
    await expect(page.getByText('Loading…', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    const exported = await csvDownload(page, 'Export CSV');
    expect(exported.filename).toBe(`placement-${report}.csv`);
    expect(exported.content.trim().split('\n').length).toBeGreaterThan(1);
    if (['drives', 'participation'].includes(report)) {
      expect(exported.content).toContain('Example Test Drive');
      expect(exported.content).not.toContain('Example history drive');
    }
    await assertNoOverflow(page);
  }
  expect(await page.evaluate(() => window.__reportMarker)).toBe(
    'same-document',
  );
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Deadline from (UTC)')).toHaveValue('');
  await expect(page.getByLabel('Branch', { exact: true })).toHaveValue('');
});

test('student cannot open reports or export report data through their session', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/admin/reports');
  await expect(page).toHaveURL('/student/dashboard');
  for (const report of [
    'overview',
    'drives',
    'companies',
    'branches',
    'statuses',
    'participation',
  ]) {
    for (const suffix of ['', '?format=csv']) {
      const response = await page.request.get(
        `/api/admin/reports/${report}${suffix}`,
      );
      expect(response.status()).toBe(403);
    }
  }
});
