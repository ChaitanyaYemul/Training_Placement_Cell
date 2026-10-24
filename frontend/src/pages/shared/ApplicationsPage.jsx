import ApplicationReviewDialog from '../admin/ApplicationReviewDialog.jsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource } from '../../hooks/useResource.js';
import { useListFilters } from '../../hooks/useListFilters.js';
import { Button, PageHeader, StatusBadge } from '../../components/ui.jsx';
import ListView from '../../components/ListView.jsx';
import { formatDate } from '../../utils/dates.js';
import WithdrawControl from '../student/WithdrawControl.jsx';
export default function ApplicationsPage() {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const path = admin ? '/admin/applications' : '/applications/me';
  const filters = useListFilters('-id');
  const query = useResource(path, filters.params, {
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });
  const [selected, setSelected] = useState(null);
  return (
    <>
      <PageHeader
        title={admin ? 'Applications' : 'My applications'}
        description={
          admin
            ? 'Review submitted applications and record selection decisions.'
            : 'Your application statuses, including drives that have since been archived.'
        }
      />
      <ListView
        query={query}
        filters={filters}
        search={false}
        sorts={['-id', 'id']}
        statuses={[
          'applied',
          'shortlisted',
          'selected',
          'rejected',
          'withdrawn',
        ]}
        columns={[
          {
            label: 'Application',
            render: (r) => (
              <>
                <Link
                  className="text-link"
                  to={`/${user.role}/applications/${r.id}`}
                >
                  #{r.id} · History
                </Link>
                {admin && <p className="text-xs">Student #{r.studentId}</p>}
              </>
            ),
          },
          {
            label: 'Drive & job',
            render: (r) => (
              <>
                {r.driveStatus === 'archived' ? (
                  <strong>{r.driveTitle}</strong>
                ) : (
                  <Link
                    className="text-link"
                    to={`/${user.role}/drives/${r.driveId}`}
                  >
                    {r.driveTitle}
                  </Link>
                )}
                <p>
                  {r.companyName} · {r.jobTitle}
                </p>
                <StatusBadge>{r.driveStatus}</StatusBadge>
              </>
            ),
          },
          { label: 'Applied at', render: (r) => formatDate(r.appliedAt) },
          {
            label: 'Application status',
            render: (r) => <StatusBadge>{r.status}</StatusBadge>,
          },
          ...(admin
            ? [
                {
                  label: 'Review',
                  render: (r) => (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelected(r);
                      }}
                    >
                      Update status
                    </Button>
                  ),
                },
              ]
            : [
                {
                  label: 'Actions',
                  render: (r) =>
                    ['applied', 'shortlisted'].includes(r.status) ? (
                      <WithdrawControl application={r} />
                    ) : (
                      <span>Final status</span>
                    ),
                },
              ]),
        ]}
      />
      {selected && (
        <ApplicationReviewDialog
          application={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
