import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { routes } from './routes.jsx';
import { resetSession } from '../api/axiosClient.js';
import { queryKeys } from '../api/queryKeys.js';
const server = setupServer();
const reply = (data) => HttpResponse.json({ success: true, data });
const anonymous = () =>
  HttpResponse.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } },
    { status: 401 },
  );
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSession();
});
afterAll(() => server.close());
function mount(path) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router };
}
function resourceHandlers() {
  server.use(
    http.get('*/api/companies', () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get('*/api/placement-drives', () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get('*/api/applications/me', () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get('*/api/announcements', () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
  );
}
it('retains the authenticated view and private cache when logout fails', async () => {
  resourceHandlers();
  server.use(
    http.get('*/api/auth/me', () =>
      reply({ id: 2, role: 'student', email: 'fake@example.edu' }),
    ),
    http.get('*/api/auth/csrf-token', () => reply({ csrfToken: 'csrf' })),
    http.post('*/api/auth/logout', () =>
      HttpResponse.json(
        { error: { message: 'Service unavailable' } },
        { status: 503 },
      ),
    ),
  );
  const { client } = mount('/student/dashboard');
  await screen.findByRole('heading', { name: 'Student dashboard' });
  // Keep this unobserved cache sentinel alive so assertions measure auth cleanup, not garbage collection.
  client.setQueryDefaults(queryKeys.resource('/students/me'), {
    gcTime: Infinity,
  });
  client.setQueryData(queryKeys.resource('/students/me'), {
    fullName: 'Private fixture',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('alert');
  expect(
    screen.getByRole('heading', { name: 'Student dashboard' }),
  ).toBeInTheDocument();
  expect(client.getQueryData(queryKeys.resource('/students/me'))).toEqual({
    fullName: 'Private fixture',
  });
});
it('clears private resources when a previously authenticated me query expires', async () => {
  resourceHandlers();
  server.use(
    http.get('*/api/auth/me', () =>
      reply({ id: 2, role: 'student', email: 'fake@example.edu' }),
    ),
  );
  const { client } = mount('/student/dashboard');
  await screen.findByRole('heading', { name: 'Student dashboard' });
  // Keep this unobserved cache sentinel alive so assertions measure auth cleanup, not garbage collection.
  client.setQueryDefaults(queryKeys.resource('/students/me'), {
    gcTime: Infinity,
  });
  client.setQueryData(queryKeys.resource('/students/me'), {
    fullName: 'Private fixture',
  });
  server.use(http.get('*/api/auth/me', anonymous));
  await client.invalidateQueries({ queryKey: queryKeys.me() });
  await screen.findByRole('heading', { name: 'Welcome back' });
  expect(
    client.getQueryData(queryKeys.resource('/students/me')),
  ).toBeUndefined();
});
it('redirects an anonymous protected deep link to sign in', async () => {
  server.use(http.get('*/api/auth/me', anonymous));
  const { router } = mount('/student/profile');
  expect(
    await screen.findByRole('heading', { name: 'Welcome back' }),
  ).toBeInTheDocument();
  expect(router.state.location.state.from).toBe('/student/profile');
});
it('shows service failure instead of claiming the visitor is logged out', async () => {
  server.use(
    http.get('*/api/auth/me', () =>
      HttpResponse.json(
        { error: { message: 'Service unavailable' } },
        { status: 503 },
      ),
    ),
  );
  mount('/student/profile');
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Service unavailable',
  );
  expect(
    screen.queryByRole('heading', { name: 'Welcome back' }),
  ).not.toBeInTheDocument();
});
it('redirects students away from admin routes and clears cached private data at logout', async () => {
  resourceHandlers();
  let authenticated = true;
  server.use(
    http.get('*/api/auth/me', () =>
      authenticated
        ? reply({ id: 2, role: 'student', email: 'fake@example.edu' })
        : anonymous(),
    ),
    http.get('*/api/auth/csrf-token', () => reply({ csrfToken: 'csrf' })),
    http.post('*/api/auth/logout', () => {
      authenticated = false;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const { client, router } = mount('/admin/companies');
  expect(
    await screen.findByRole('heading', { name: 'Student dashboard' }),
  ).toBeInTheDocument();
  // Keep this unobserved cache sentinel alive so assertions measure auth cleanup, not garbage collection.
  client.setQueryDefaults(queryKeys.resource('/students/me'), {
    gcTime: Infinity,
  });
  client.setQueryData(queryKeys.resource('/students/me'), {
    fullName: 'Private fixture',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('heading', { name: 'Welcome back' });
  expect(
    client.getQueryData(queryKeys.resource('/students/me')),
  ).toBeUndefined();
  expect(router.state.location.pathname).toBe('/login');
});
it('expires an authenticated session on a business 401 and clears the cache', async () => {
  server.use(
    http.get('*/api/auth/me', () =>
      reply({ id: 2, role: 'student', email: 'fake@example.edu' }),
    ),
    http.get('*/api/companies', anonymous),
  );
  const { client } = mount('/student/companies');
  await screen.findByRole('heading', { name: 'Welcome back' });
  expect(screen.getByRole('status')).toHaveTextContent('Your session expired');
  await waitFor(() =>
    expect(
      client.getQueryData(queryKeys.resource('/companies')),
    ).toBeUndefined(),
  );
});
it('public registration sends only student fields and leads to login, with field errors accessible', async () => {
  let submitted;
  server.use(
    http.get('*/api/auth/me', anonymous),
    http.get('*/api/auth/csrf-token', () => reply({ csrfToken: 'csrf' })),
    http.post('*/api/auth/register', async ({ request }) => {
      submitted = await request.json();
      return HttpResponse.json(
        {
          error: {
            message: 'Invalid request',
            details: [{ field: 'body.email', message: 'Email already used' }],
          },
        },
        { status: 400 },
      );
    }),
  );
  mount('/register');
  await screen.findByLabelText('Email');
  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: 'Example Student' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'fake@example.edu' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'example-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Email')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(submitted).toEqual({
    email: 'fake@example.edu',
    password: 'example-password',
    fullName: 'Example Student',
  });
  server.use(
    http.post('*/api/auth/register', () => reply({ id: 3, role: 'student' })),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(
    await screen.findByRole('heading', { name: 'Welcome back' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Account created');
});
