# Phase 5: student applications

## Scope

Complete the remaining AGENTS.md Phase 5 student functionality on top of the Phase 4 profile/academics, dashboard, companies, drive details/timeline and announcements. Add apply, withdrawal and an owned application/history view, including archived-drive context. Reports and general reconciliation remain deferred. AGENTS.md, approved assumptions, stack, ownership and historical migrations are unchanged. No one-student-one-offer restriction is introduced.

## Plan and implementation

1. Reuse the existing MySQL application/history schema, UNIQUE/FK constraints, indexes and deletion guards.
2. Add student-only POST /placement-drives/:id/applications and PATCH /applications/:id/withdraw, with role/CSRF/Origin/strict validation. Add GET /applications/:id for an owning student or administrator.
3. Keep business decisions in services and SQL in repositories. Submission uses the shared eligibility evaluator. The service locks drive -> student -> latest academic record; profile/academic editing locks the same parent. Drive edits/publication already lock the same drive. Duplicate reads happen only after the drive lock; the UNIQUE key remains the final guard.
4. Check the database deadline before validation and again in a guarded INSERT at the write. Insert the initial applied event in the same transaction. If history fails, both writes roll back.
5. Keep administrator and withdrawal transitions in applicationStatusService; both lock the application row. Students can withdraw only their own applied/shortlisted application, independently of later eligibility/deadline/drive status. Withdrawal is terminal.
6. Read application, joined drive/company/posting context and ordered history in a single SELECT snapshot. Do not make archived drives generally visible or duplicate relational records into Mongo.
7. Add React confirmation controls, owned/admin detail routes, timestamp/actor/status history and recovery links. Keep components presentational with shared mutation hooks; no optimistic updates or automatic write retry.
8. Verify API roles/ownership/CSRF, all eligibility criteria, latest-record boundaries, deadline equality, concurrent duplicates, transaction rollback, concurrent academic/lifecycle edits and selection/withdrawal, actual Mongo outage, accessible UI and complete browser flows. Update API/security/setup/DBMS documentation.

## Client freshness and errors

`useApplicationMutation` invalidates /applications and descendants (including /applications/me and /applications/:id), /admin/applications, and /placement-drives. Dashboard totals and eligibility/hasApplied views therefore refresh after a successful application or withdrawal. Administrator status changes use the same invalidation set. Polling/focus and explicit Refresh handle changes from another browser session; no socket behavior is implied.

Apply is offered only for a server-visible published drive whose current server-provided eligibility is true and hasApplied is false. The API still checks profile completeness, actual database deadline, eligibility and duplicates at submission; client display is advisory. PROFILE_INCOMPLETE/NOT_ELIGIBLE errors link to profile recovery, and DUPLICATE_APPLICATION links to existing applications. Status/history is never changed locally before success.

Withdrawal confirmations explain finality. Existing applications link to detail/history from the list. Terminal states remove withdrawal controls. Archived drives show their application summary/history with a neutral archive explanation and no general drive link. New routes are /student/applications/:id and /admin/applications/:id. Administrator remarks are explicitly labeled visible to the student. History remains plain React-escaped text.

## Database impact and limits

No migration, new table, collection or index is required. All application work uses MySQL, including during Mongo outages. The current application schema stores status/history, not an immutable snapshot of eligibility/profile/company names; those remain relational records as approved. Complete profile means name, enrollment, branch, graduation year and at least one academic record; phone is optional. The latest semester supplies CGPA/backlogs. Academic details remain self-reported.

Submission returns 201 application detail/history. Withdrawal returns 200 latest detail/history; data is re-read after commit. Failed/ambiguous network writes are not automatically replayed; refresh the list/detail to determine the saved state. Reapplying never produces another row for the same student/drive.
