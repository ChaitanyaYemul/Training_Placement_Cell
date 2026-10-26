import { QueryState } from '../../components/ui.jsx';
import ReportChart from './ReportChart.jsx';

const metrics = [
  ['drives', 'Drives'],
  ['companies', 'Companies'],
  ['students', 'Registered students'],
  ['participants', 'Participating students'],
  ['applications', 'Applications'],
  ['selections', 'Selections'],
  ['placedStudents', 'Placed students'],
  ['placementRate', 'Placement rate'],
];
export default function ReportSummary({ query }) {
  const data = query.data?.data;
  return (
    <QueryState query={query}>
      <dl className="report-metrics mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(([key, label]) => (
          <div className="panel" key={key}>
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="mt-2 text-3xl font-semibold text-sky-950">
              {data?.[key] ?? '—'}
              {key === 'placementRate' ? '%' : ''}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mb-6 text-sm text-slate-600">
        Placed students are counted once; selections count successful
        applications. Placement rate uses all registered students in the
        selected branch as its denominator. Participation includes withdrawn
        applications.
      </p>
      {query.data?.warnings?.length > 0 && (
        <p role="status" className="notice mb-5">
          Recruitment statistics are temporarily unavailable. Placement totals
          remain available.
        </p>
      )}
      {data?.recruitment && (
        <div className="mb-8 grid gap-5 xl:grid-cols-2">
          <ReportChart
            title="Recruitment round types"
            rows={data.recruitment.roundTypes}
            labelKey="roundType"
          />
          <ReportChart
            title="Required documents across drives"
            rows={data.recruitment.requiredDocuments}
            labelKey="document"
          />
        </div>
      )}
    </QueryState>
  );
}
