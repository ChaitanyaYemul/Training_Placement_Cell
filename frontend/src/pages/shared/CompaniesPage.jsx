import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useResource } from '../../hooks/useResource.js';
import { useListFilters } from '../../hooks/useListFilters.js';
import ListView from '../../components/ListView.jsx';
import DeleteAction from '../../components/DeleteAction.jsx';
import { PageHeader, StatusBadge } from '../../components/ui.jsx';
export default function CompaniesPage() {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const prefix = `/${user.role}`;
  const filters = useListFilters();
  const query = useResource('/companies', filters.params);
  return (
    <>
      <PageHeader
        title="Companies"
        description="Explore the organizations hiring from campus."
      >
        {admin && (
          <Link className="button button-primary" to="/admin/companies/new">
            Add company
          </Link>
        )}
      </PageHeader>
      <ListView
        query={query}
        filters={filters}
        activeFilter={admin}
        sorts={['-createdAt', 'createdAt', 'name', '-name']}
        columns={[
          {
            label: 'Company',
            render: (r) => (
              <Link className="text-link" to={`${prefix}/companies/${r.id}`}>
                {r.name}
              </Link>
            ),
          },
          { label: 'Industry', render: (r) => r.industry || '—' },
          { label: 'Headquarters', render: (r) => r.headquarters || '—' },
          {
            label: 'Activity',
            render: (r) => (
              <StatusBadge>{r.isActive ? 'Active' : 'Inactive'}</StatusBadge>
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
                        to={`/admin/companies/${r.id}/edit`}
                      >
                        Edit
                      </Link>
                      <DeleteAction
                        name={r.name}
                        path={`/companies/${r.id}`}
                        invalidate={['/companies', '/placement-drives']}
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
