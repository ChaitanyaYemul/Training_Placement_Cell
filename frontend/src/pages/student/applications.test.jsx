import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AuthContext } from '../../context/authContext.js';
import { resetSession } from '../../api/axiosClient.js';
import ApplyControl from './ApplyControl.jsx';
import ApplicationDetailPage from '../shared/ApplicationDetailPage.jsx';
const server = setupServer();
const reply = (data) => HttpResponse.json({ success: true, data });
const originalShow = HTMLDialogElement.prototype.showModal,
  originalClose = HTMLDialogElement.prototype.close;
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // jsdom modal stubs only; real focus and Escape behavior is verified by Chromium.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  server.resetHandlers();
  resetSession();
});
afterAll(() => {
  server.close();
  HTMLDialogElement.prototype.showModal = originalShow;
  HTMLDialogElement.prototype.close = originalClose;
});
function mount(element, path = '/student/drives/1', route = path) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const router = createMemoryRouter(
    [
      { path: route, element },
      {
        path: '/student/applications/22',
        element: <h1>Application received</h1>,
      },
      { path: '/student/profile', element: <h1>Profile</h1> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={{ user: { role: 'student', id: 2 } }}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { client, router };
}
const drive = {
  id: 1,
  title: 'Example drive',
  status: 'published',
  hasApplied: false,
  myEligibility: { eligible: true },
};
it('links existing applications instead of offering resubmission', () => {
  mount(<ApplyControl drive={{ ...drive, hasApplied: true }} />);
  expect(
    screen.getByRole('link', { name: 'View my applications →' }),
  ).toHaveAttribute('href', '/student/applications');
  expect(
    screen.queryByRole('button', { name: 'Apply to this drive' }),
  ).not.toBeInTheDocument();
});
it('submits an empty self-owned body and navigates to the persisted application', async () => {
  let body;
  server.use(
    http.get('*/api/auth/csrf-token', () => reply({ csrfToken: 'csrf' })),
    http.post('*/api/placement-drives/1/applications', async ({ request }) => {
      body = await request.json();
      return reply({ id: 22, status: 'applied' });
    }),
  );
  mount(<ApplyControl drive={drive} />);
  fireEvent.click(screen.getByRole('button', { name: 'Apply to this drive' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await screen.findByRole('heading', { name: 'Application received' });
  expect(body).toEqual({});
});
it('keeps a rejected submission visible with profile recovery and never claims success', async () => {
  server.use(
    http.get('*/api/auth/csrf-token', () => reply({ csrfToken: 'csrf' })),
    http.post('*/api/placement-drives/1/applications', () =>
      HttpResponse.json(
        {
          error: {
            code: 'PROFILE_INCOMPLETE',
            message: 'Complete your profile before applying.',
          },
        },
        { status: 409 },
      ),
    ),
  );
  mount(<ApplyControl drive={drive} />);
  fireEvent.click(screen.getByRole('button', { name: 'Apply to this drive' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Complete my profile' }),
  ).toHaveAttribute('href', '/student/profile');
  expect(
    screen.queryByRole('heading', { name: 'Application received' }),
  ).not.toBeInTheDocument();
});
it('withdraws an owned application, refreshes history, and removes terminal-status actions', async () => {
  let withdrawn = false;
  const application = () => ({
    id: 7,
    driveId: 1,
    driveTitle: 'Example drive',
    driveStatus: 'published',
    companyName: 'Example company',
    jobTitle: 'Example job',
    status: withdrawn ? 'withdrawn' : 'applied',
    appliedAt: '2030-01-01T00:00:00Z',
    history: [
      {
        id: 1,
        fromStatus: null,
        toStatus: 'applied',
        actorRole: 'student',
        changedAt: '2030-01-01T00:00:00Z',
      },
      ...(withdrawn
        ? [
            {
              id: 2,
              fromStatus: 'applied',
              toStatus: 'withdrawn',
              actorRole: 'student',
              changedAt: '2030-01-02T00:00:00Z',
            },
          ]
        : []),
    ],
  });
  server.use(
    http.get('*/api/applications/7', () => reply(application())),
    http.get('*/api/auth/csrf-token', () => reply({ csrfToken: 'csrf' })),
    http.patch('*/api/applications/7/withdraw', () => {
      withdrawn = true;
      return reply(application());
    }),
  );
  mount(
    <ApplicationDetailPage />,
    '/student/applications/7',
    '/student/applications/:id',
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Withdraw application' }),
  );
  expect(screen.getByRole('dialog')).toHaveTextContent('Withdrawal is final.');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await screen.findByText('applied → withdrawn');
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Withdraw application' }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.getByText(
      'Your withdrawal is final. You cannot reapply to this drive.',
    ),
  ).toBeInTheDocument();
});
it('renders archived drive context and official history while escaping markup', async () => {
  server.use(
    http.get('*/api/applications/7', () =>
      reply({
        driveId: 1,
        driveTitle: 'Archived drive',
        driveStatus: 'archived',
        companyName: 'Example company',
        jobTitle: 'Example job',
        status: 'selected',
        history: [
          {
            id: 1,
            fromStatus: 'shortlisted',
            toStatus: 'selected',
            actorRole: 'admin',
            remarks: '<script>not executable</script>',
            changedAt: '2030-01-01T00:00:00Z',
          },
        ],
      }),
    ),
  );
  mount(
    <ApplicationDetailPage />,
    '/student/applications/7',
    '/student/applications/:id',
  );
  await screen.findByText(
    'This drive is archived. Your application and history remain available here.',
  );
  expect(
    screen.queryByRole('link', { name: 'View placement drive →' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Withdraw application' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText('<script>not executable</script>'),
  ).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
});
