import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useResource, useResourceMutation } from './useResource.js';
import { resetSession } from '../api/axiosClient.js';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSession();
});
afterAll(() => server.close());
function Harness({ path }) {
  const query = useResource('/admin/reports/overview');
  const mutation = useResourceMutation([path]);
  return (
    <>
      <p>Selections: {query.data?.data.selections ?? 'loading'}</p>
      <button
        onClick={() => mutation.mutate({ path, method: 'patch', body: {} })}
      >
        Save
      </button>
    </>
  );
}
it.each([
  '/placement-drives/1/status',
  '/admin/applications/1/status',
  '/applications/1/withdraw',
  '/companies/1',
  '/job-postings/1',
  '/students/me/academic-records',
])('refreshes report totals after successful mutation %s', async (path) => {
  let selections = 1;
  let reads = 0;
  server.use(
    http.get('*/api/admin/reports/overview', () => {
      reads++;
      return HttpResponse.json({ data: { selections } });
    }),
    http.get('*/api/auth/csrf-token', () =>
      HttpResponse.json({ data: { csrfToken: 'test-csrf' } }),
    ),
    http.patch(`*/api${path}`, () => {
      selections = 2;
      return HttpResponse.json({ data: {} });
    }),
  );
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <Harness path={path} />
    </QueryClientProvider>,
  );
  await screen.findByText('Selections: 1');
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText('Selections: 2');
  await waitFor(() => expect(reads).toBe(2));
});
