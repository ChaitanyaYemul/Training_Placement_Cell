import { useState } from 'react';
import { useResource } from '../../hooks/useResource.js';
import { Button, Field, QueryState } from '../../components/ui.jsx';

function ResourceFilter({ label, path, value, onChange, companyId }) {
  const [search, setSearch] = useState('');
  const query = useResource(path, {
    limit: 100,
    ...(search ? { q: search } : {}),
    ...(companyId ? { companyId } : {}),
  });
  const rows = query.data?.data || [];
  return (
    <div className="space-y-3">
      <Field
        label={`Search ${label.toLowerCase()}`}
        type="search"
        maxLength={100}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <QueryState query={query}>
        <Field
          label={label}
          as="select"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">All {label.toLowerCase()}</option>
          {value && !rows.some((row) => String(row.id) === String(value)) && (
            <option value={value}>Selected ID {value}</option>
          )}
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name || row.title}
            </option>
          ))}
        </Field>
        {query.data?.meta?.total > rows.length && (
          <p className="text-xs text-stone-600">
            Showing the first 100 matches. Refine the search to find another
            record.
          </p>
        )}
      </QueryState>
    </div>
  );
}

export default function ReportFilters({ state }) {
  const branches = useResource('/branches');
  const { filters, update, reset } = state;
  return (
    <form
      className="panel mb-8 space-y-5"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Report filters"
    >
      <h2 className="text-lg font-semibold">Filter reports</h2>
      <p className="text-sm text-stone-600">
        Date filters include drives whose registration deadline falls within
        these UTC calendar days. Filters apply to every report and CSV export.
      </p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Field
          label="Deadline from (UTC)"
          type="date"
          value={filters.from || ''}
          onChange={(event) => update('from', event.target.value)}
        />
        <Field
          label="Deadline to (UTC)"
          type="date"
          value={filters.to || ''}
          onChange={(event) => update('to', event.target.value)}
        />
        <QueryState query={branches}>
          <Field
            label="Branch"
            as="select"
            value={filters.branchId || ''}
            onChange={(event) => update('branchId', event.target.value)}
          >
            <option value="">All branches</option>
            {branches.data?.data?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} — {branch.name}
              </option>
            ))}
          </Field>
        </QueryState>
        <ResourceFilter
          label="Companies"
          path="/companies"
          value={filters.companyId}
          onChange={(value) => update('companyId', value)}
        />
        <ResourceFilter
          label="Drives"
          path="/placement-drives"
          value={filters.driveId}
          companyId={filters.companyId}
          onChange={(value) => update('driveId', value)}
        />
      </div>
      <Button type="button" variant="secondary" onClick={reset}>
        Clear filters
      </Button>
    </form>
  );
}
