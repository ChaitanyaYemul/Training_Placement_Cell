import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource } from '../../hooks/useResource.js';
import { useListFilters } from '../../hooks/useListFilters.js';
import ListView from '../../components/ListView.jsx';
import { PageHeader, StatusBadge } from '../../components/ui.jsx';
import { formatDate } from '../../utils/dates.js';
export default function DrivesPage() {
  const { user } = useAuth();
  const filters = useListFilters('registrationDeadline');
  const query = useResource('/placement-drives', filters.params);
  return (
    <>
      <PageHeader
        title="Placement drives"
        description="Explore eligibility, deadlines and recruitment plans."
      >
        {user.role === 'admin' && (
          <Link className="button button-primary" to="/admin/drives/new">
            Create drive
          </Link>
        )}
      </PageHeader>
      <ListView
        query={query}
        filters={filters}
        statuses={
          user.role === 'admin'
            ? ['draft', 'published', 'completed', 'cancelled', 'archived']
            : ['published', 'completed', 'cancelled']
        }
        sorts={[
          'registrationDeadline',
          '-registrationDeadline',
          '-createdAt',
          'createdAt',
        ]}
        columns={[
          {
            label: 'Drive',
            render: (r) => (
              <div>
                <Link className="text-link" to={`/${user.role}/drives/${r.id}`}>
                  {r.title}
                </Link>
                <span className="company-cell-caption">
                  Campus recruitment · Drive #{r.id}
                </span>
              </div>
            ),
          },
          {
            label: 'Status',
            render: (r) => <StatusBadge>{r.status}</StatusBadge>,
          },
          {
            label: 'Deadline',
            render: (r) => formatDate(r.registrationDeadline),
          },
          {
            label: 'Branches',
            render: (r) =>
              r.eligibleBranches?.map((b) => b.code).join(', ') ||
              'Not configured',
          },
          ...(user.role === 'student'
            ? [
                {
                  label: 'Your eligibility',
                  render: (r) =>
                    r.myEligibility
                      ? r.myEligibility.eligible
                        ? 'Meets academic criteria'
                        : 'Criteria not met'
                      : 'Complete academic records',
                },
              ]
            : []),
        ]}
      />
    </>
  );
}
