import FilterBar from './FilterBar.jsx';
import { Pagination, QueryState } from './ui.jsx';
export default function ListView({
  query,
  columns,
  filters,
  sorts = ['-createdAt', 'createdAt'],
  statuses,
  search = true,
  activeFilter = false,
}) {
  return (
    <>
      <FilterBar
        query={query}
        filters={filters}
        sorts={sorts}
        statuses={statuses}
        search={search}
        activeFilter={activeFilter}
      />
      <QueryState
        query={query}
        empty={query.isSuccess && !query.data?.data?.length}
      >
        <div
          className="table-scroll"
          role="region"
          aria-label={`${columns[0]?.label || 'Record'} results`}
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th scope="col" key={c.label}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data?.data?.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.label}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
      <Pagination
        meta={query.data?.meta}
        onPage={(page) => filters.update('page', String(page))}
      />
    </>
  );
}
