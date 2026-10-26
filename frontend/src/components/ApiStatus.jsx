import { useHealth } from '../hooks/useHealth.js';
export default function ApiStatus() {
  const { data, isPending, isError, refetch, isFetching } = useHealth();
  return (
    <section
      aria-label="API connection"
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <p className="eyebrow mb-3">Environment status</p>
      <div role="status" aria-live="polite">
        {isPending ? (
          <p>Connecting to the API…</p>
        ) : isError ? (
          <>
            <p>API unavailable. Check that the backend is running.</p>
            <button
              className="mt-3 font-semibold underline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Retry connection
            </button>
          </>
        ) : !data ? (
          <p>No health information available.</p>
        ) : (
          <>
            <p className="font-semibold text-sky-800">
              {data.status === 'ok' ? 'API connected' : 'API status unknown'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Database readiness is not checked by this endpoint.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
