import { Button, Field, PageHeader } from '../../components/ui.jsx';
import { useReport, useReportFilters } from '../../hooks/useReports.js';
import { reportViews } from '../../services/reportViews.js';
import ReportFilters from './ReportFilters.jsx';
import ReportSummary from './ReportSummary.jsx';
import ReportTable from './ReportTable.jsx';
import ReportExport from './ReportExport.jsx';

export default function ReportsPage() {
  const state = useReportFilters();
  const { filters, report, page, update } = state;
  const overview = useReport('overview', filters);
  const query = useReport(report, { ...filters, page, limit: 10 });
  return (
    <>
      <PageHeader
        title="Placement reports"
        description="Placement outcomes, student participation and recruitment statistics."
      >
        <ReportExport
          key={`overview-${JSON.stringify(filters)}`}
          report="overview"
          filters={filters}
          label="Export overview CSV"
        />
      </PageHeader>
      <ReportFilters state={state} />
      <ReportSummary query={overview} />
      <section aria-label="Detailed placement reports">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <Field
            label="Report"
            as="select"
            value={report}
            onChange={(event) => update('report', event.target.value)}
          >
            {Object.entries(reportViews).map(([value, view]) => (
              <option key={value} value={value}>
                {view.title}
              </option>
            ))}
          </Field>
          <div className="flex flex-wrap items-start gap-3">
            <Button
              variant="secondary"
              disabled={overview.isFetching || query.isFetching}
              onClick={() => {
                overview.refetch();
                query.refetch();
              }}
            >
              Refresh reports
            </Button>
            <ReportExport
              key={`${report}-${JSON.stringify(filters)}`}
              report={report}
              filters={filters}
            />
          </div>
        </div>
        {report === 'participation' && (
          <p className="notice mb-5">
            Eligibility reflects current complete profiles and latest academic
            records for active students. It does not change past application
            decisions or mean a drive is open for applications. Participation
            rate is eligible participants divided by eligible students now.
          </p>
        )}
        <ReportTable
          report={report}
          query={query}
          onPage={(next) => update('page', String(next))}
        />
      </section>
    </>
  );
}
