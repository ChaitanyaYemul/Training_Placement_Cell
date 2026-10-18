import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import ApiStatus from './ApiStatus.jsx';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
function renderStatus() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}
describe('API status', () => {
  it('shows loading then connection success', async () => {
    server.use(
      http.get('*/api/health', async () => {
        await delay(30);
        return HttpResponse.json({ success: true, data: { status: 'ok' } });
      }),
    );
    renderStatus();
    expect(screen.getByText('Connecting to the API…')).toBeInTheDocument();
    expect(await screen.findByText('API connected')).toBeInTheDocument();
    expect(
      screen.getByText('Database connections are not configured.'),
    ).toBeInTheDocument();
  });
  it('shows an actionable network error', async () => {
    server.use(http.get('*/api/health', () => HttpResponse.error()));
    renderStatus();
    expect(
      await screen.findByRole('button', { name: 'Retry connection' }),
    ).toBeInTheDocument();
  });
  it('handles an empty health response', async () => {
    server.use(
      http.get('*/api/health', () =>
        HttpResponse.json({ success: true, data: null }),
      ),
    );
    renderStatus();
    expect(
      await screen.findByText('No health information available.'),
    ).toBeInTheDocument();
  });
});
