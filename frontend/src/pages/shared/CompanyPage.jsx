import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource } from '../../hooks/useResource.js';
import { useListFilters } from '../../hooks/useListFilters.js';
import ListView from '../../components/ListView.jsx';
import DeleteAction from '../../components/DeleteAction.jsx';
import { PageHeader, QueryState } from '../../components/ui.jsx';
export default function CompanyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const company = useResource(`/companies/${id}`);
  const filters = useListFilters();
  const path = `/companies/${id}/job-postings`;
  const postings = useResource(path, filters.params);
  return (
    <>
      <QueryState query={company}>
        <PageHeader
          title={company.data?.data?.name}
          description={company.data?.data?.industry}
        />
        <div className="panel mb-8">
          <p className="whitespace-pre-wrap">
            {company.data?.data?.description ||
              'No company description provided.'}
          </p>
          {company.data?.data?.website && (
            <a
              className="text-link mt-3 inline-block"
              href={company.data.data.website}
              target="_blank"
              rel="noreferrer"
            >
              Company website ↗
            </a>
          )}
        </div>
      </QueryState>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Job postings</h2>
        {admin && (
          <Link
            className="button button-primary"
            to={`/admin/companies/${id}/job-postings/new`}
          >
            Add job posting
          </Link>
        )}
      </div>
      <ListView
        query={postings}
        filters={filters}
        activeFilter={admin}
        columns={[
          {
            label: 'Role',
            render: (r) => (
              <>
                <strong>{r.title}</strong>
                <p className="text-xs">Posting ID: {r.id}</p>
                <details className="mt-2">
                  <summary>Description</summary>
                  <p className="max-w-lg whitespace-pre-wrap">
                    {r.description}
                  </p>
                </details>
              </>
            ),
          },
          { label: 'Type', render: (r) => r.jobType.replaceAll('_', ' ') },
          {
            label: 'CTC / Location',
            render: (r) => (
              <>
                {r.ctcLpa == null ? 'CTC not specified' : `${r.ctcLpa} LPA`}
                <p>{r.location || 'Location TBD'}</p>
              </>
            ),
          },
          ...(admin
            ? [
                {
                  label: 'Actions',
                  render: (r) => (
                    <div className="flex flex-wrap gap-3">
                      <Link
                        className="text-link"
                        to={`/admin/job-postings/${r.id}/edit`}
                      >
                        Edit
                      </Link>
                      <DeleteAction
                        name={r.title}
                        path={`/job-postings/${r.id}`}
                        invalidate={[
                          path,
                          `/companies/${id}`,
                          '/placement-drives',
                        ]}
                      />
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
    </>
  );
}
