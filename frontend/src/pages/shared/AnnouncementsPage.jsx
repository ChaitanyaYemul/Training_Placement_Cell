import AnnouncementFeed from '../../components/AnnouncementFeed.jsx';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource, useResourceMutation } from '../../hooks/useResource.js';
import { useListFilters } from '../../hooks/useListFilters.js';
import { useToast } from '../../context/toastContext.js';
import {
  Button,
  PageHeader,
  QueryState,
  StatusBadge,
} from '../../components/ui.jsx';
import ListView from '../../components/ListView.jsx';
import ResourceForm from '../../components/ResourceForm.jsx';
import DeleteAction from '../../components/DeleteAction.jsx';
import { announcementFields } from '../../services/formSpecs.js';
import { announcementBody, announcementInput } from '../../services/forms.js';
import { formatDate } from '../../utils/dates.js';
export default function AnnouncementsPage() {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const filters = useListFilters();
  const query = useResource('/announcements', filters.params, {
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });
  const branches = useResource('/branches', undefined, { enabled: admin });
  const [editing, setEditing] = useState(null);
  const mutation = useResourceMutation(['/announcements']);
  const toast = useToast();
  const start = (row) => {
    mutation.reset();
    setEditing(row);
  };
  return (
    <>
      <PageHeader
        title="Announcements"
        description="Official updates from the Training & Placement Cell."
      >
        {admin && (
          <Button disabled={mutation.isPending} onClick={() => start({})}>
            New announcement
          </Button>
        )}
      </PageHeader>
      {editing && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">
            {editing.id ? 'Edit announcement' : 'Create announcement'}
          </h2>
          <QueryState query={branches}>
            <ResourceForm
              key={editing.id || 'new'}
              fields={announcementFields}
              initial={announcementInput(editing)}
              branches={branches.data?.data}
              pending={mutation.isPending}
              error={mutation.error}
              onSave={async (body) => {
                await mutation.mutateAsync({
                  path: editing.id
                    ? `/announcements/${editing.id}`
                    : '/announcements',
                  method: editing.id ? 'patch' : 'post',
                  body: announcementBody(body),
                });
                toast('Announcement saved.');
                setEditing(null);
              }}
            />
          </QueryState>
          <Button
            variant="secondary"
            className="mt-3"
            disabled={mutation.isPending}
            onClick={() => setEditing(null)}
          >
            Cancel editing
          </Button>
        </section>
      )}
      {admin ? (
        <ListView
          query={query}
          filters={filters}
          statuses={['draft', 'published']}
          columns={[
            {
              label: 'Announcement',
              render: (r) => (
                <>
                  <strong>{r.title}</strong>
                  <p className="line-clamp-3 max-w-lg whitespace-pre-wrap">
                    {r.body}
                  </p>
                </>
              ),
            },
            {
              label: 'Publication',
              render: (r) => (
                <>
                  <StatusBadge>{r.status}</StatusBadge>
                  <p>{formatDate(r.publishedAt)}</p>
                </>
              ),
            },
            {
              label: 'Audience',
              render: (r) =>
                r.audience.type === 'all'
                  ? 'All students'
                  : `Branches: ${r.audience.branchIds.join(', ')}`,
            },
            {
              label: 'Actions',
              render: (r) => (
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    disabled={mutation.isPending}
                    onClick={() => start(r)}
                  >
                    Edit
                  </Button>
                  <DeleteAction
                    name={r.title}
                    path={`/announcements/${r.id}`}
                    invalidate={['/announcements']}
                  />
                </div>
              ),
            },
          ]}
        />
      ) : (
        <AnnouncementFeed query={query} filters={filters} />
      )}
    </>
  );
}
