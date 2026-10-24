import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource } from '../../hooks/useResource.js';
import Card from '../../components/Card.jsx';
import { PageHeader, QueryState, StatusBadge } from '../../components/ui.jsx';
import { formatDate } from '../../utils/dates.js';
const poll = { refetchInterval: 45_000, refetchIntervalInBackground: false };
function Summary({ title, query, to }) {
  return (
    <Card title={title}>
      <QueryState query={query}>
        <p className="mb-4 text-4xl font-semibold text-emerald-950">
          {query.data?.meta?.total ?? '—'}
        </p>
        <Link className="text-link" to={to}>
          View {title.toLowerCase()} →
        </Link>
      </QueryState>
    </Card>
  );
}
export default function Dashboard() {
  const { user } = useAuth();
  const prefix = `/${user.role}`;
  const companies = useResource('/companies', { limit: 1 }, poll);
  const drives = useResource(
    '/placement-drives',
    {
      limit: 5,
      sort: 'registrationDeadline',
      ...(user.role === 'student' ? { status: 'published' } : {}),
    },
    poll,
  );
  const applications = useResource(
    user.role === 'admin' ? '/admin/applications' : '/applications/me',
    { limit: 1 },
    poll,
  );
  const announcements = useResource('/announcements', { limit: 5 }, poll);
  return (
    <>
      <PageHeader
        title={user.role === 'admin' ? 'Admin dashboard' : 'Student dashboard'}
        description={
          user.role === 'admin'
            ? 'Coordinate the next step from campus to career.'
            : 'Your placement journey, in one place.'
        }
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Summary
          title="Companies"
          query={companies}
          to={`${prefix}/companies`}
        />
        <Summary
          title={
            user.role === 'student' ? 'Published drives' : 'Placement drives'
          }
          query={drives}
          to={`${prefix}/drives`}
        />
        <Summary
          title="Applications"
          query={applications}
          to={`${prefix}/applications`}
        />
      </div>
      {user.role === 'student' && (
        <p className="notice mb-6">
          Keep your profile and semester records current.{' '}
          <Link className="text-link" to="/student/profile">
            Review profile completeness →
          </Link>
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Drive deadlines">
          <QueryState
            query={drives}
            empty={drives.isSuccess && !drives.data?.data?.length}
          >
            <ul className="space-y-4">
              {drives.data?.data?.map((drive) => (
                <li key={drive.id}>
                  <Link
                    className="text-link"
                    to={`${prefix}/drives/${drive.id}`}
                  >
                    {drive.title}
                  </Link>
                  <p className="text-sm">
                    {formatDate(drive.registrationDeadline)}
                  </p>
                  <StatusBadge>{drive.status}</StatusBadge>
                </li>
              ))}
            </ul>
            <Link
              className="text-link mt-5 inline-block"
              to={`${prefix}/drives`}
            >
              Browse all drives →
            </Link>
          </QueryState>
        </Card>
        <Card title="Latest announcements">
          <QueryState
            query={announcements}
            empty={announcements.isSuccess && !announcements.data?.data?.length}
          >
            <ul className="space-y-4">
              {announcements.data?.data?.map((a) => (
                <li key={a.id}>
                  <strong className="text-stone-900">{a.title}</strong>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm">
                    {a.body}
                  </p>
                  <StatusBadge>{a.priority}</StatusBadge>
                </li>
              ))}
            </ul>
            <Link
              className="text-link mt-5 inline-block"
              to={`${prefix}/announcements`}
            >
              Read announcements →
            </Link>
          </QueryState>
        </Card>
      </div>
    </>
  );
}
