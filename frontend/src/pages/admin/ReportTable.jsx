import { Link } from 'react-router-dom';
import { Pagination, QueryState, StatusBadge } from '../../components/ui.jsx';
import { reportViews } from '../../services/reportViews.js';
import { formatDate } from '../../utils/dates.js';
import ReportChart from './ReportChart.jsx';

function Cell({ field, row }) {
  if (field === 'title')
    return (
      <Link className="text-link" to={`/admin/drives/${row.driveId}`}>
        {row[field]}
      </Link>
    );
  if (field === 'companyName')
    return (
      <Link className="text-link" to={`/admin/companies/${row.companyId}`}>
        {row[field]}
      </Link>
    );
  if (field === 'registrationDeadline') return formatDate(row[field]);
  if (field === 'status') return <StatusBadge>{row[field]}</StatusBadge>;
  if (field.endsWith('Rate')) return `${row[field]}%`;
  return row[field];
}

export default function ReportTable({ report, query, onPage }) {
  const view = reportViews[report];
  const rows = query.data?.data || [];
  return (
    <QueryState query={query} empty={query.isSuccess && !rows.length}>
      {report === 'statuses' && (
        <div className="mb-5">
          <ReportChart
            title="Applications by current status"
            rows={rows}
            labelKey="status"
          />
        </div>
      )}
      <div
        className="table-scroll"
        role="region"
        aria-label={`${view.title} table`}
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">{view.title}</caption>
          <thead>
            <tr>
              {view.columns.map(([field, label]) => (
                <th scope="col" key={field}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[view.key]}>
                {view.columns.map(([field]) => (
                  <td key={field}>
                    <Cell field={field} row={row} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination meta={query.data?.meta} onPage={onPage} />
    </QueryState>
  );
}
