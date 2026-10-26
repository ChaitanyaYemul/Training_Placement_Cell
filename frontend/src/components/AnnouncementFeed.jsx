import FilterBar from './FilterBar.jsx';
import { Pagination, QueryState, StatusBadge } from './ui.jsx';
import { formatDate } from '../utils/dates.js';
export default function AnnouncementFeed({ query, filters }) {
  return (
    <>
      <FilterBar query={query} filters={filters} />
      <QueryState
        query={query}
        empty={query.isSuccess && !query.data?.data?.length}
      >
        <div className="space-y-5">
          {query.data?.data?.map((r) => (
            <article key={r.id} className="panel announcement-card">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge>{r.priority}</StatusBadge>
                {r.isPinned && <StatusBadge>Pinned</StatusBadge>}
              </div>
              <h2 className="text-xl font-semibold">{r.title}</h2>
              <p className="my-3 text-sm text-slate-500">
                {formatDate(r.publishedAt)}
              </p>
              <p className="whitespace-pre-wrap break-words">{r.body}</p>
              {r.relatedDriveId && (
                <p className="mt-3 text-sm text-slate-600">
                  Related placement drive #{r.relatedDriveId}. Current drives
                  are available in Placement drives.
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {r.links?.map((link) => (
                  <li key={link.url}>
                    <a
                      className="text-link"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </QueryState>
      <Pagination
        meta={query.data?.meta}
        onPage={(page) => filters.update('page', String(page))}
      />
    </>
  );
}
