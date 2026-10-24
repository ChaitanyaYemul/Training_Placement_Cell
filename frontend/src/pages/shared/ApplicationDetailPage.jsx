import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource } from '../../hooks/useResource.js';
import {
  Button,
  PageHeader,
  QueryState,
  StatusBadge,
} from '../../components/ui.jsx';
import WithdrawControl from '../student/WithdrawControl.jsx';
import { formatDate } from '../../utils/dates.js';
export default function ApplicationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const query = useResource(`/applications/${id}`, undefined, {
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });
  const row = query.data?.data;
  return (
    <QueryState query={query}>
      <PageHeader
        title={`Application #${id}`}
        description="Your application and its status history."
      >
        <Button variant="secondary" onClick={() => query.refetch()}>
          Refresh application
        </Button>
      </PageHeader>
      {row && (
        <>
          <section className="panel space-y-3">
            <h2 className="text-xl font-semibold">{row.driveTitle}</h2>
            <p>
              {row.companyName} · {row.jobTitle}
            </p>
            <p>
              Application status: <StatusBadge>{row.status}</StatusBadge>
            </p>
            <p>
              Drive status: <StatusBadge>{row.driveStatus}</StatusBadge>
            </p>
            <p>Applied: {formatDate(row.appliedAt)}</p>
            {row.driveStatus === 'archived' ? (
              <p className="notice">
                This drive is archived. Your application and history remain
                available here.
              </p>
            ) : (
              <Link
                className="text-link inline-block"
                to={`/${user.role}/drives/${row.driveId}`}
              >
                View placement drive →
              </Link>
            )}
            <div>
              {user.role === 'student' &&
                ['applied', 'shortlisted'].includes(row.status) && (
                  <WithdrawControl application={row} />
                )}
            </div>
            {row.status === 'withdrawn' && (
              <p className="notice">
                Your withdrawal is final. You cannot reapply to this drive.
              </p>
            )}
          </section>
          <section className="panel mt-6">
            <h2 className="mb-5 text-xl font-semibold">Status history</h2>
            {!row.history.length && (
              <p>No history entries are available for this application.</p>
            )}
            <ol className="space-y-5">
              {row.history.map((event) => (
                <li
                  key={event.id}
                  className="border-l-2 border-emerald-200 pl-5"
                >
                  <p className="font-semibold">
                    {event.fromStatus ? `${event.fromStatus} → ` : ''}
                    {event.toStatus}
                  </p>
                  <p className="text-sm text-stone-500">
                    {formatDate(event.changedAt)} ·{' '}
                    {event.actorRole === 'admin'
                      ? 'Placement administrator'
                      : 'Student'}
                  </p>
                  {event.remarks && (
                    <p className="mt-2 whitespace-pre-wrap break-words">
                      {event.remarks}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </QueryState>
  );
}
