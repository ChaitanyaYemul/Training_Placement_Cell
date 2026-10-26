import { useReportExport } from '../../hooks/useReports.js';
import { Button, ErrorState } from '../../components/ui.jsx';

export default function ReportExport({
  report,
  filters,
  label = 'Export CSV',
}) {
  const mutation = useReportExport(report, filters);
  return (
    <div className="space-y-3">
      <Button
        variant="secondary"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? 'Preparing CSV…' : label}
      </Button>
      {mutation.isError && <ErrorState error={mutation.error} />}
      {mutation.isSuccess && (
        <p role="status" className="text-sm text-emerald-900">
          CSV download started.
        </p>
      )}
    </div>
  );
}
