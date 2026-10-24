import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import RecruitmentEditor from './RecruitmentEditor.jsx';
import { resetSession } from '../../api/axiosClient.js';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSession();
});
afterAll(() => server.close());
it('keeps a conflicting edit visible and explicitly reloads the latest recruitment version', async () => {
  let version = 1;
  let submitted;
  const dto = () => ({
    version,
    rounds: [
      {
        roundNumber: 1,
        roundName: version === 1 ? 'Old assessment' : 'Latest assessment',
        roundType: 'assessment',
        mode: 'online',
        description: '',
        scheduledAt: null,
        details: {},
      },
    ],
    requiredDocuments: ['College ID'],
    additionalRequirements: {},
  });
  server.use(
    http.get('*/api/placement-drives/1/rounds', () =>
      HttpResponse.json({ data: dto() }),
    ),
    http.get('*/api/auth/csrf-token', () =>
      HttpResponse.json({ data: { csrfToken: 'csrf' } }),
    ),
    http.put('*/api/placement-drives/1/rounds', async ({ request }) => {
      submitted = await request.json();
      version = 2;
      return HttpResponse.json(
        {
          error: {
            message: 'Recruitment process changed; reload before editing',
          },
        },
        { status: 409 },
      );
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [{ path: '/admin/drives/:id/rounds', element: <RecruitmentEditor /> }],
    { initialEntries: ['/admin/drives/1/rounds'] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const input = await screen.findByLabelText('Round name');
  fireEvent.change(input, { target: { value: 'Unsaved local assessment' } });
  fireEvent.click(
    screen.getByRole('button', { name: 'Save recruitment plan' }),
  );
  await screen.findByRole('alert');
  expect(input).toHaveValue('Unsaved local assessment');
  expect(submitted.version).toBe(1);
  expect(submitted.requiredDocuments).toEqual(['College ID']);
  fireEvent.click(screen.getByRole('button', { name: 'Fetch latest version' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Round name')).toHaveValue(
      'Latest assessment',
    ),
  );
});
