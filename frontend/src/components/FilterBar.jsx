import { Button, Field } from './ui.jsx';
export default function FilterBar({
  query,
  filters,
  sorts = ['-createdAt', 'createdAt'],
  statuses,
  search = true,
  activeFilter = false,
}) {
  return (
    <form
      className="mb-6 flex flex-wrap items-end gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      {search && (
        <Field
          label="Search"
          type="search"
          maxLength={100}
          value={filters.params.q || ''}
          onChange={(e) => filters.update('q', e.target.value)}
        />
      )}
      {statuses && (
        <Field
          label="Status"
          as="select"
          value={filters.params.status || ''}
          onChange={(e) => filters.update('status', e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Field>
      )}
      {activeFilter && (
        <Field
          label="Activity"
          as="select"
          value={filters.params.isActive || ''}
          onChange={(e) => filters.update('isActive', e.target.value)}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Field>
      )}
      <Field
        label="Sort"
        as="select"
        value={filters.params.sort}
        onChange={(e) => filters.update('sort', e.target.value)}
      >
        {sorts.map((s) => (
          <option key={s} value={s}>
            {{
              '-createdAt': 'Newest first',
              createdAt: 'Oldest first',
              name: 'Name A–Z',
              '-name': 'Name Z–A',
              registrationDeadline: 'Deadline: soonest',
              '-registrationDeadline': 'Deadline: latest',
              '-id': 'Newest first',
              id: 'Oldest first',
            }[s] || s}
          </option>
        ))}
      </Field>
      <Button
        variant="secondary"
        type="button"
        onClick={() => query.refetch()}
        disabled={query.isFetching}
      >
        Refresh
      </Button>
    </form>
  );
}
