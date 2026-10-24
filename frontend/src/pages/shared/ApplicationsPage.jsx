import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource, useResourceMutation } from '../../hooks/useResource.js';
import { useListFilters } from '../../hooks/useListFilters.js';
import { useToast } from '../../context/toastContext.js';
import {
  Button,
  Field,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import ListView from '../../components/ListView.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { formatDate } from '../../utils/dates.js';
export default function ApplicationsPage() {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const path = admin ? '/admin/applications' : '/applications/me';
  const filters = useListFilters('-id');
  const query = useResource(path, filters.params, {
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('shortlisted');
  const [remarks, setRemarks] = useState('');
  const mutation = useResourceMutation(['/admin/applications']);
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
                #{r.id}
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
                        mutation.reset();
                        setSelected(r);
                        setRemarks('');
                        setStatus('shortlisted');
                      }}
                    >
                      Update status
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />
      {selected && (
        <ConfirmDialog
          title={`Update application #${selected.id}`}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setSelected(null)}
          onConfirm={async () => {
            try {
              await mutation.mutateAsync({
                path: `/admin/applications/${selected.id}/status`,
                method: 'patch',
                body: { status, remarks },
              });
              toast('Application status recorded.');
              setSelected(null);
            } catch {
              /* Server decides valid transitions. */
            }
          }}
        >
          <div className="space-y-4">
            <p>
              Current status: {selected.status}. The server validates this
              transition and records its history.
            </p>
            <Field
              label="New application status"
              as="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {['shortlisted', 'selected', 'rejected'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Field>
            <Field
              label="Remarks"
              as="textarea"
              maxLength={1000}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
