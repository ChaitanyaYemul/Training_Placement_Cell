import { lazy, Suspense } from 'react';
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage.jsx'));

export default function ReportsRoute() {
  return (
    <Suspense fallback={<p role="status">Loading reports…</p>}>
      <ReportsPage />
    </Suspense>
  );
}
