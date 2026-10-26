import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import ReportsPage from './ReportsPage.jsx';
import { resetSession } from '../../api/axiosClient.js';

const server = setupServer();
const totals = {
  drives: 12,
  companies: 8,
  students: 42,
  participants: 17,
  applications: 31,
  selections: 9,
  placedStudents: 7,
  placementRate: 16.67,
  recruitment: {
    roundTypes: [{ roundType: 'interview', count: 4 }],
    requiredDocuments: [],
  },
};
const drive = {
  driveId: 1,
  title: 'Campus drive',
  status: 'published',
  companyId: 1,
  companyName: 'Example Company',
  registrationDeadline: '2030-11-01T00:00:00Z',
  applications: 3,
  participants: 3,
  selections: 2,
  placedStudents: 2,
};
const list = (data, page = 1, total = data.length) =>
  HttpResponse.json({
    data,
    meta: { page, limit: 10, total, totalPages: Math.ceil(total / 10) },
  });
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSession();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function mount(path = '/admin/reports') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [{ path: '/admin/reports', element: <ReportsPage /> }],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}
function defaults() {
  server.use(
    http.get('*/api/branches', () =>
      list([{ id: 1, code: 'CSE', name: 'Computer Science' }]),
    ),
    http.get('*/api/companies', () =>
      list([{ id: 1, name: 'Example Company' }]),
    ),
    http.get('*/api/placement-drives', () =>
      list([{ id: 1, title: 'Campus drive' }]),
    ),
    http.get('*/api/admin/reports/overview', () =>
      HttpResponse.json({ data: totals }),
    ),
    http.get('*/api/admin/reports/:report', () => list([drive])),
  );
}

it('shows loading, authoritative overview totals, recruitment charts and paginated drive results', async () => {
  defaults();
  server.use(
    http.get('*/api/admin/reports/drives', async ({ request }) => {
      await delay(30);
      const page = Number(new URL(request.url).searchParams.get('page'));
      return list(
        page === 1
          ? [drive]
          : [{ ...drive, driveId: 2, title: 'Second drive' }],
        page,
        12,
      );
    }),
  );
  mount();
  expect(
    screen
      .getAllByRole('status')
      .some((node) => node.textContent.includes('Loading')),
  ).toBe(true);
  await screen.findByRole('link', { name: 'Campus drive' });
  expect(
    screen.getByText('Registered students').parentElement,
  ).toHaveTextContent('42');
  expect(
    screen.getByText('Placed students', { selector: 'dt' }).parentElement,
  ).toHaveTextContent('7');
  expect(screen.getByText('Recruitment round types')).toBeInTheDocument();
  expect(screen.getByText('12 records · Page 1 of 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByRole('link', { name: 'Second drive' });
  expect(
    screen.getByRole('region', { name: 'Drive results table' }),
  ).toHaveAttribute('tabindex', '0');
});

it('applies shared filters, resets pagination and switches report without a document navigation', async () => {
  defaults();
  const requests = [];
  server.use(
    http.get('*/api/admin/reports/:report', ({ request, params }) => {
      requests.push({
        report: params.report,
        params: Object.fromEntries(new URL(request.url).searchParams),
      });
      return params.report === 'overview'
        ? HttpResponse.json({ data: totals })
        : list([]);
    }),
  );
  const router = mount('/admin/reports?page=2');
  await screen.findByRole('option', { name: 'CSE — Computer Science' });
  fireEvent.change(screen.getByLabelText('Branch'), { target: { value: '1' } });
  await waitFor(() => expect(router.state.location.search).toBe('?branchId=1'));
  fireEvent.change(screen.getByLabelText('Deadline from (UTC)'), {
    target: { value: '2030-01-01' },
  });
  fireEvent.change(screen.getByLabelText('Deadline to (UTC)'), {
    target: { value: '2030-12-31' },
  });
  fireEvent.change(screen.getByLabelText('Companies'), {
    target: { value: '1' },
  });
  fireEvent.change(await screen.findByLabelText('Drives'), {
    target: { value: '1' },
  });
  fireEvent.change(screen.getByLabelText('Report'), {
    target: { value: 'participation' },
  });
  await waitFor(() =>
    expect(requests).toContainEqual({
      report: 'participation',
      params: {
        branchId: '1',
        from: '2030-01-01',
        to: '2030-12-31',
        companyId: '1',
        driveId: '1',
        page: '1',
        limit: '10',
      },
    }),
  );
  expect(
    screen.getByText(/Eligibility reflects current complete profiles/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(router.state.location.search).toBe('?report=participation');
});

it('keeps SQL totals visible on Mongo degradation and retries errors to an explicit empty state', async () => {
  defaults();
  let fail = true;
  server.use(
    http.get('*/api/admin/reports/overview', () =>
      HttpResponse.json({
        data: { ...totals, recruitment: null },
        warnings: [{ code: 'REPORT_RECRUITMENT_UNAVAILABLE' }],
      }),
    ),
    http.get('*/api/admin/reports/drives', () =>
      fail
        ? HttpResponse.json(
            { error: { message: 'Report database unavailable' } },
            { status: 503 },
          )
        : list([]),
    ),
  );
  mount();
  await screen.findByText('Report database unavailable');
  expect(
    screen.getByText('Registered students').parentElement,
  ).toHaveTextContent('42');
  expect(
    screen.getByText(/Recruitment statistics are temporarily unavailable/),
  ).toBeInTheDocument();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('No records found.');
});

it('exports the complete filtered report and surfaces structured CSV request errors', async () => {
  defaults();
  let fail = true;
  const csvRequests = [];
  const createUrl = vi.fn(() => 'blob:placement-report');
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = vi.fn();
    },
  );
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  server.use(
    http.get('*/api/admin/reports/drives', ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      if (params.format !== 'csv') return list([drive]);
      csvRequests.push(params);
      return fail
        ? HttpResponse.json(
            {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Export temporarily unavailable',
              },
            },
            { status: 503 },
          )
        : HttpResponse.text('Drive,Applications\r\nCampus drive,3\r\n', {
            headers: { 'Content-Type': 'text/csv' },
          });
    }),
  );
  try {
    mount('/admin/reports?branchId=1&page=2');
    await screen.findByRole('link', { name: 'Campus drive' });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await screen.findByText('Export temporarily unavailable');
    expect(createUrl).not.toHaveBeenCalled();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await screen.findByText('CSV download started.');
    expect(csvRequests).toEqual([
      { branchId: '1', format: 'csv' },
      { branchId: '1', format: 'csv' },
    ]);
    expect(click).toHaveBeenCalledOnce();
    expect(createUrl.mock.calls[0][0]).toBeInstanceOf(Blob);
  } finally {
    vi.unstubAllGlobals();
  }
});
