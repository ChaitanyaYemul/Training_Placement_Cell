import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { AuthContext } from '../context/authContext.js';
import { resetSession } from '../api/axiosClient.js';
import CompaniesPage from '../pages/shared/CompaniesPage.jsx';
import ProfilePage from '../pages/student/ProfilePage.jsx';
import DrivePage from '../pages/shared/DrivePage.jsx';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSession();
});
afterAll(() => server.close());
function mount(element, path, route) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([{ path: route || path, element }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={{ user: { id: 2, role: 'student' } }}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}
it('paginates using server metadata, shows empty lists and retries a failed page', async () => {
  let failed = false;
  server.use(
    http.get('*/api/companies', async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') || 1);
      if (page === 2 && !failed) {
        failed = true;
        return HttpResponse.json(
          { error: { message: 'Temporary failure' } },
          { status: 503 },
        );
      }
      await delay(20);
      return HttpResponse.json({
        data:
          page === 1
            ? [{ id: 1, name: 'Example Company', isActive: true }]
            : [],
        meta: { page, total: 11, totalPages: 2 },
      });
    }),
  );
  mount(<CompaniesPage />, '/student/companies');
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  await screen.findByText('Example Company');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('No records found.');
  expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
});
it('updates profile-dependent queries after a successful save', async () => {
  let name = 'Example Student';
  let reads = 0;
  server.use(
    http.get('*/api/students/me', () => {
      reads++;
      return HttpResponse.json({
        data: {
          fullName: name,
          enrollmentNumber: 'TEST',
          branchId: 1,
          graduationYear: 2030,
        },
      });
    }),
    http.get('*/api/branches', () =>
      HttpResponse.json({
        data: [{ id: 1, code: 'CSE', name: 'Computer Science' }],
      }),
    ),
    http.get('*/api/students/me/academic-records', () =>
      HttpResponse.json({ data: [] }),
    ),
    http.get('*/api/auth/csrf-token', () =>
      HttpResponse.json({ data: { csrfToken: 'csrf' } }),
    ),
    http.patch('*/api/students/me', async ({ request }) => {
      name = (await request.json()).fullName;
      return HttpResponse.json({ data: { fullName: name } });
    }),
  );
  mount(<ProfilePage />, '/student/profile');
  const input = await screen.findByLabelText('Full name');
  fireEvent.change(input, { target: { value: 'Updated Student' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(reads).toBeGreaterThan(1));
  expect(input).toHaveValue('Updated Student');
});
it('keeps relational drive information visible when recruitment is unavailable', async () => {
  server.use(
    http.get('*/api/placement-drives/1', () =>
      HttpResponse.json({
        data: {
          id: 1,
          title: 'Example Drive',
          jobPostingId: 1,
          status: 'published',
          eligibleBranches: [],
        },
        warnings: [{ code: 'RECRUITMENT_DATA_UNAVAILABLE' }],
      }),
    ),
    http.get('*/api/job-postings/1', () =>
      HttpResponse.json({ data: { id: 1, title: 'Developer', companyId: 1 } }),
    ),
  );
  mount(<DrivePage />, '/student/drives/1', '/student/drives/:id');
  await screen.findByRole('heading', { name: 'Example Drive' });
  expect(
    screen.getByText(/Recruitment information is temporarily unavailable/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Apply' }),
  ).not.toBeInTheDocument();
});
