import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource } from '../../hooks/useResource.js';
import Card from '../../components/Card.jsx';
import { PageHeader, QueryState, StatusBadge } from '../../components/ui.jsx';
import { formatDate } from '../../utils/dates.js';
import Icon from '../../components/Icon.jsx';
import { m as motion } from 'motion/react';
const poll = { refetchInterval: 45_000, refetchIntervalInBackground: false };
function Summary({ title, query, to, icon, index }) {
  return (
    <motion.section
      className="summary-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="summary-top">
        <h2>{title}</h2>
        <span className="icon-tile">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <QueryState query={query}>
        <p className="summary-number">{query.data?.meta?.total ?? '—'}</p>
        <Link className="summary-bottom" to={to}>
          <span>View {title.toLowerCase()}</span>
          <Icon name="arrow" size={14} />
        </Link>
      </QueryState>
    </motion.section>
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
      <section className="dashboard-banner">
        <div>
          <p className="eyebrow">
            {user.role === 'admin'
              ? 'EVERY OPPORTUNITY COUNTS'
              : 'YOUR FUTURE IS TAKING SHAPE'}
          </p>
          <h2>
            {user.role === 'admin'
              ? 'Great futures start with a connected campus.'
              : 'A little preparation. A world of possibilities.'}
          </h2>
          <p>
            {user.role === 'admin'
              ? 'Keep your drives, applications, and student opportunities moving forward.'
              : 'Discover your next opportunity and keep your placement journey on track.'}
          </p>
        </div>
        <Link className="button button-primary" to={`${prefix}/drives`}>
          Explore drives <Icon name="arrow" size={15} />
        </Link>
      </section>
      <div className="summary-grid">
        <Summary
          title="Companies"
          icon="companies"
          index={0}
          query={companies}
          to={`${prefix}/companies`}
        />
        <Summary
          title={
            user.role === 'student' ? 'Published drives' : 'Placement drives'
          }
          query={drives}
          icon="drives"
          index={1}
          to={`${prefix}/drives`}
        />
        <Summary
          title="Applications"
          icon="applications"
          index={2}
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
                <li key={drive.id} className="dashboard-row">
                  <div>
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
                  </div>
                  <span className="icon-tile">
                    <Icon name="calendar" size={17} />
                  </span>
                </li>
              ))}
            </ul>
            <Link className="card-footer-link" to={`${prefix}/drives`}>
              Browse all drives <Icon name="arrow" size={15} />
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
                <li key={a.id} className="dashboard-row">
                  <div>
                    <strong className="text-slate-900">{a.title}</strong>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm">
                      {a.body}
                    </p>
                    <StatusBadge>{a.priority}</StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
            <Link className="card-footer-link" to={`${prefix}/announcements`}>
              Read announcements <Icon name="arrow" size={15} />
            </Link>
          </QueryState>
        </Card>
      </div>
    </>
  );
}
