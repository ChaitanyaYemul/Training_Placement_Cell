import { test, expect, signIn, assertNoOverflow } from './helpers.js';
test('student registers, signs in and saves profile and academics without document navigation', async ({
  page,
}) => {
  await page.goto('/register');
  const email = `phase4-${Date.now()}@example.edu`;
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Example Phase Four Student');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('test-only-browser-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByText('Account created. Sign in to complete your profile.'),
  ).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('test-only-browser-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: 'My profile', exact: true }).click();
  await page.evaluate(() => {
    window.__navigationMarker = 'preserved';
  });
  await page.getByLabel('Enrollment number').fill(`PHASE4-${Date.now()}`);
  await page
    .getByLabel('Branch', { exact: true })
    .selectOption({ label: 'CSE — Computer Science and Engineering' });
  await page.getByLabel('Graduation year').fill('2030');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByText('Profile saved. Eligibility will refresh.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add semester' }).click();
  await page.getByLabel('SGPA', { exact: true }).fill('8.25');
  await page.getByLabel('CGPA', { exact: true }).fill('8.25');
  await page.getByRole('button', { name: 'Save academic records' }).click();
  await expect(page.getByText('Academic records saved.')).toBeVisible();
  await expect(
    page.getByText(
      'Your profile has the required personal and academic information.',
    ),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__navigationMarker)).toBe(
    'preserved',
  );
  await page
    .getByRole('link', { name: 'Placement drives', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Example Test Drive', exact: true })
    .click();
  await expect(
    page.getByText('You meet the academic eligibility criteria.'),
  ).toBeVisible();
  await expect(
    page.getByText('College ID Card', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
});
test('admin creates a company, job, drive and recruitment plan, then publishes without reload', async ({
  page,
}) => {
  await signIn(page, 'admin');
  await page
    .getByRole('link', { name: 'Companies & jobs', exact: true })
    .click();
  await page.getByRole('link', { name: 'Add company' }).click();
  await page.getByLabel('Company name').fill('Example Phase Four Employer');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Example Phase Four Employer' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Add job posting' }).click();
  await page.getByLabel('Job title').fill('Example Graduate Engineer');
  await page.getByLabel('Job description').fill('Fictional test role.');
  await page.getByLabel('Job type').selectOption('full_time');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const posting = await page.getByText(/Posting ID:/).textContent();
  const postingId = /\d+/.exec(posting)[0];
  await page
    .getByRole('link', { name: 'Placement drives', exact: true })
    .click();
  await page.getByRole('link', { name: 'Create drive' }).click();
  await page.getByLabel('Job posting ID', { exact: true }).fill(postingId);
  await page.getByLabel('Drive title').fill('Example Phase Four Drive');
  await page
    .getByLabel('Registration deadline', { exact: true })
    .fill('2031-01-01T12:00');
  await page.getByLabel('Minimum CGPA').fill('7');
  await page.getByLabel('Maximum active backlogs').fill('0');
  await page.getByLabel('Graduation year', { exact: true }).fill('2030');
  await page
    .getByLabel('Eligible branches')
    .selectOption({ label: 'CSE — Computer Science and Engineering' });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Example Phase Four Drive' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Edit rounds & schedule' }).click();
  await page.getByRole('button', { name: 'Add round', exact: true }).click();
  await page.getByLabel('Round name').fill('Example assessment');
  await page
    .getByLabel('Required documents (one per line)')
    .fill('College ID\nAcademic transcripts');
  await page.getByRole('button', { name: 'Save recruitment plan' }).click();
  await expect(page.getByText('Recruitment plan saved.')).toBeVisible();
  await page.goBack();
  await page.evaluate(() => {
    window.__navigationMarker = 'preserved';
  });
  await page
    .getByRole('button', { name: 'Update status', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText('Drive status updated.')).toBeVisible();
  expect(await page.evaluate(() => window.__navigationMarker)).toBe(
    'preserved',
  );
  await expect(
    page.locator('span').filter({ hasText: /^published$/ }),
  ).toBeVisible();
});
test('admin reviews an application and publishes an announcement visible to a student', async ({
  page,
  browser,
}) => {
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Applications', exact: true }).click();
  await page
    .getByRole('button', { name: 'Update status', exact: true })
    .first()
    .click();
  await page.getByLabel('New application status').selectOption('shortlisted');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText('Application status recorded.')).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'shortlisted', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Announcements', exact: true }).click();
  await page.getByRole('button', { name: 'New announcement' }).click();
  await page
    .getByLabel('Title', { exact: true })
    .fill('Example Phase Four Notice');
  await page
    .getByLabel('Message', { exact: true })
    .fill('Example announcement published through the admin frontend.');
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByLabel('Publish at', { exact: true }).fill('2020-01-01T12:00');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Announcement saved.')).toBeVisible();
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
  });
  const student = await context.newPage();
  await signIn(student);
  await student
    .getByRole('link', { name: 'Announcements', exact: true })
    .click();
  await expect(
    student.getByRole('heading', { name: 'Example Phase Four Notice' }),
  ).toBeVisible();
  await student
    .getByRole('link', { name: 'My applications', exact: true })
    .click();
  await expect(
    student.getByRole('cell', { name: 'shortlisted', exact: true }),
  ).toBeVisible();
  await context.close();
});
for (const width of [375, 1280])
  test(`student workspace is responsive and protects admin navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    await assertNoOverflow(page);
    await page.screenshot({
      path: `test-results/student-dashboard-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('link', { name: 'Placement drives', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Placement drives' }),
    ).toBeVisible();
    await assertNoOverflow(page);
    await page.goto('/admin/companies');
    await expect(page).toHaveURL(/\/student\/dashboard$/);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(
      page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    await page.goto('/student/profile');
    await expect(page).toHaveURL(/\/login$/);
  });
test('admin edits, deactivates and deletes a company with a keyboard-operable confirmation on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await signIn(page, 'admin');
  await page.screenshot({
    path: 'test-results/admin-dashboard-375.png',
    fullPage: true,
  });
  await page
    .getByRole('link', { name: 'Companies & jobs', exact: true })
    .click();
  await page.getByRole('link', { name: 'Add company', exact: true }).click();
  await page.getByLabel('Company name').fill('Example Disposable Employer');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/admin\/companies\/\d+$/);
  const companyId = /\/companies\/(\d+)/.exec(page.url())[1];
  await page
    .getByRole('link', { name: 'Companies & jobs', exact: true })
    .click();
  await page
    .getByRole('row')
    .filter({ hasText: 'Example Disposable Employer' })
    .getByRole('link', { name: 'Edit', exact: true })
    .click();
  await page.getByLabel('Company name').fill('Example Updated Employer');
  await page.getByLabel('Active', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Example Updated Employer' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Companies & jobs', exact: true })
    .click();
  const row = page
    .getByRole('row')
    .filter({ hasText: 'Example Updated Employer' });
  await expect(
    row.getByRole('cell', { name: 'Inactive', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__navigationMarker = 'preserved';
  });
  await row.getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Confirm', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await row.getByRole('button', { name: 'Delete' }).click();
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Example Updated Employer' }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.__navigationMarker)).toBe(
    'preserved',
  );
  const gone = await page.request.get(`/api/companies/${companyId}`);
  expect(gone.status()).toBe(404);
  await assertNoOverflow(page);
});
