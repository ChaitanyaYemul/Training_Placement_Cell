# Phase 4 frontend integration

The approved Phase 4 scope combines React authentication, a student workspace and an administrator workspace using existing Phase 3 APIs. This is the user's approved grouping; it does not claim completion of every later phase in AGENTS.md. The original file and its historical status table remain unchanged.

## Boundaries and dependencies

Pages compose query hooks and presentational components. Hooks use API functions; one Axios instance handles credentials, CSRF and normalized errors. Pure field mappings and date conversions live in services/utils. No new dependencies or schema migrations are needed. Database ownership and backend authorization/business rules remain unchanged.

AuthProvider bootstraps with `/auth/me`, distinguishes anonymous 401 from service errors, and provides login/logout mutations. Public registration fixes the role server-side and routes to sign-in instead of inventing automatic login. Deep-link redirects stay within the authenticated role's relative route prefix. ProtectedRoute is a navigation convenience; the backend remains the security boundary.

The Axios client keeps the complete response envelope so list `meta` and degraded-drive `warnings` survive. A 204 becomes `{data:null}`. Concurrent writes share a CSRF bootstrap request; the login response replaces the token. No credential/token is persisted in localStorage/sessionStorage. Business 401 and expiry detected by auth revalidation clear cached user data and navigate with React Router. Login/logout increment a session generation; late responses from an earlier generation are cancelled. A changed account/role detected on revalidation also removes resource caches. Failed writes are not replayed automatically; after 403 the next explicit write fetches CSRF again.

## Routes

Public: `/`, `/login`, `/register`.

Students: `/student/dashboard`, `/student/profile`, `/student/companies`, `/student/companies/:id`, `/student/drives`, `/student/drives/:id`, `/student/drives/:id/timeline`, `/student/applications`, `/student/announcements`.

Admins: `/admin/dashboard`, `/admin/companies`, `/admin/companies/new`, `/admin/companies/:id`, `/admin/companies/:id/edit`, `/admin/companies/:id/job-postings/new`, `/admin/job-postings/:id/edit`, `/admin/drives`, `/admin/drives/new`, `/admin/drives/:id`, `/admin/drives/:id/edit`, `/admin/drives/:id/rounds`, `/admin/drives/:id/schedule`, `/admin/applications`, `/admin/announcements`.

Timeline/schedule aliases share the corresponding view/editor. Dashboard totals come from server list metadata, never the number of rows on a fetched page. Dashboards display bounded recent lists without fetching every drive or making recruitment queries for each row. Existing APIs expose application status, not a history timeline or report aggregates; the UI makes no claim otherwise.

## Freshness and failure handling

Central keys use `['resource', path, params]` and `['auth','me']`. Mutations invalidate the affected path and descendants, plus declared dependent resource families. Company/posting changes refresh companies and drives; drive/recruitment changes refresh drive lists/details/schedules; profile/academic saves refresh own records and eligibility; branch changes also refresh announcement visibility; announcement saves refresh lists/dashboard snippets; selection changes refresh administrator application lists/totals.

Queries use a 30-second stale time, refetch on focus/reconnect, retry once on non-4xx errors, and no mutation retry. Visible dashboards, drive details, announcements and applications poll every 45 seconds with background polling off. Edit screens avoid focus refetch; background failures with cached data display an error without unmounting the view/form. Successful writes use server responses and invalidation, with no optimistic business updates or document reloads.

Recruitment edits carry the server version. A 409 preserves local input and offers an explicit fetch of the latest version, replacing local edits only on that action. Creation and rounds saves remain separate: failed rounds configuration leaves the valid draft. SQL-backed drive information remains readable alongside Mongo warnings. Draft deletion may succeed with a cleanup-pending warning, which is shown in the success notification.

Dates use one institution timezone (default Asia/Kolkata; frontend configurable). Editable wall times convert back to UTC at whole-second precision for SQL. Unchanged timestamps retain the original server value so editing a title does not accidentally shorten a deadline with nonzero seconds. No client clock decides application acceptance or eligibility.

## UI and limits

Shared controls provide associated labels, distinct hints/error descriptions, visible focus, native constraint validation and disabled pending submissions. Native modal dialogs provide focus confinement, Escape dismissal when idle, and focus restoration. Announcements render plain text with React escaping. Informational document lists do not upload files. Branch ids, cross-reference ids and valid status transitions are always validated by the server.

The admin recruitment editor permits JSON objects for bounded company-specific round details/additional requirements; the announcement editor accepts a bounded JSON link list. These match the existing flexible API fields. Malformed JSON stays local; valid JSON still undergoes backend validation. No UI component library, Socket.IO or read/unread state is added.

Deferred: application submission/withdrawal, history-detail endpoints, reports, reconciliation, file storage, password reset/change, notifications and production deployment.
