# Backend API — implemented contract

Base path `/api`. Responses use `{success:true,data:...}` and errors use `{success:false,error:{code,message,details?}}`. Auth responses are non-cacheable. Database/migration errors are sanitized.

| Method/path          | Auth                    | Input                        | Result                                                                                                       |
| -------------------- | ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET /health          | Public                  | None                         | 200 process liveness; runtime reports phase authentication and databases not-checked, not database readiness |
| GET /auth/csrf-token | Public                  | None                         | 200 `{csrfToken}` plus anonymous session cookie                                                              |
| POST /auth/register  | CSRF + Origin           | `{email,password,fullName?}` | 201 `{id,email,role:"student"}`; role input is discarded; other unknown keys rejected; no automatic login    |
| POST /auth/login     | CSRF + Origin           | `{email,password}`           | 200 `{user:{id,email,role,studentId,adminId},csrfToken}`; session regenerated                                |
| GET /auth/me         | Session                 | None                         | 200 authoritative safe current user; 401 anonymous/inactive                                                  |
| POST /auth/logout    | Session + CSRF + Origin | Empty body                   | 204; session destroyed and cookie cleared                                                                    |

Register/login enforce email syntax, bounded passwords and unknown-key rejection. Duplicate registration returns 409 CONFLICT. Invalid/unknown/inactive login returns the same 401 UNAUTHENTICATED message. Invalid CSRF/origin returns 403 FORBIDDEN. Combined login/register rate limiting returns 429 RATE_LIMITED. Invalid inputs return 400 VALIDATION_ERROR with field paths, never submitted values. Backend role middleware returns 403 for insufficient permissions; business routes below belong to the separately tested business API commit.

A client must first obtain a token with cookie credentials enabled, send X-CSRF-Token and the configured Origin on writes, then use the new login token afterward. No session ids or hashes appear in JSON. No bearer token/localStorage authentication exists. All protected data must use the session's user id, not a client-supplied ownership id.

## Business APIs (separate commit)

All routes below require an active session. All POST/PUT/PATCH/DELETE routes additionally require the configured Origin and current X-CSRF-Token. Administrator checks run before body/id validation on privileged endpoints. Read requests use validated path/query fields; unknown inputs are rejected.

| Method/path                          | Role          | Body/result                                                                                                                                                          |
| ------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /branches                        | Student/admin | Finite branch lookup array                                                                                                                                           |
| GET /students/me                     | Student       | Own profile only                                                                                                                                                     |
| PATCH /students/me                   | Student       | Any nonempty subset of fullName, enrollmentNumber, phone, branchId, graduationYear; no userId/role/studentId                                                         |
| GET /students/me/academic-records    | Student       | Own semester records                                                                                                                                                 |
| PUT /students/me/academic-records    | Student       | `{records:[{semester,sgpa,cgpa,activeBacklogs}]}`; transactional replacement, unique semesters, max 12                                                               |
| GET /companies                       | Student/admin | Paginated companies; students see active only                                                                                                                        |
| GET /companies/:id                   | Student/admin | Company; inactive hidden from students                                                                                                                               |
| POST /companies                      | Admin         | Required name; optional industry, website, description, headquarters, contactEmail, isActive; 201                                                                    |
| PATCH /companies/:id                 | Admin         | Nonempty subset of company fields                                                                                                                                    |
| DELETE /companies/:id                | Admin         | 204 if unreferenced, otherwise 409; deactivate instead                                                                                                               |
| GET /companies/:id/job-postings      | Student/admin | Paginated postings; students require active posting/company and a student-visible drive                                                                              |
| POST /companies/:id/job-postings     | Admin         | title, description, jobType; optional ctcLpa, location, isActive; 201                                                                                                |
| GET /job-postings/:id                | Student/admin | Posting subject to the same student visibility                                                                                                                       |
| PATCH /job-postings/:id              | Admin         | Nonempty subset of posting fields                                                                                                                                    |
| DELETE /job-postings/:id             | Admin         | 204 if unreferenced, otherwise 409                                                                                                                                   |
| GET /placement-drives                | Student/admin | Paginated drives, eligibleBranches; student myEligibility and hasApplied are computed server-side                                                                    |
| GET /placement-drives/:id            | Student/admin | Drive plus recruitment document, or NULL recruitment with a warning during an outage/missing published document                                                      |
| POST /placement-drives               | Admin         | jobPostingId, title, registrationDeadline; optional description, driveDate, minCgpa, maxActiveBacklogs, eligibleGraduationYear, eligibleBranchIds; always draft; 201 |
| PATCH /placement-drives/:id          | Admin         | Nonempty subset; validates lifecycle/eligibility/deadline locks; status must use its own endpoint                                                                    |
| PATCH /placement-drives/:id/status   | Admin         | `{status:"published                                                                                                                                                  | completed | cancelled                                                                        | archived"}`; only approved transitions |
| DELETE /placement-drives/:id         | Admin         | Draft without applications only; 200 `{data:null}`, possibly cleanup warning after SQL commit                                                                        |
| GET /placement-drives/:id/rounds     | Student/admin | Recruitment rounds, schedules, checklist and version; hidden drive is 404 for students                                                                               |
| PUT /placement-drives/:id/rounds     | Admin         | Full rounds/checklist/additionalRequirements replacement; editable draft/published only                                                                              |
| GET /announcements                   | Student/admin | Paginated documents; students see published, nonexpired, matching-audience documents only                                                                            |
| POST /announcements                  | Admin         | title, body, audience; optional status, priority, relatedDriveId, links, isPinned, publishedAt, expiresAt; 201                                                       |
| PATCH /announcements/:id             | Admin         | Nonempty subset; 24-hex ObjectId path                                                                                                                                |
| DELETE /announcements/:id            | Admin         | 204                                                                                                                                                                  |
| GET /applications/me                 | Student       | Paginated own application history, including archived-drive context                                                                                                  |
| GET /admin/applications              | Admin         | Paginated application summaries                                                                                                                                      |
| PATCH /admin/applications/:id/status | Admin         | `{status:"shortlisted                                                                                                                                                | selected  | rejected",remarks?}`; approved transitions and history insert in one transaction |

List responses use `{success:true,data:[...],meta:{page,limit,total,totalPages}}`. Defaults page=1, limit=10; maximum limit=100. Supported query fields:

- Companies: q, isActive=true/false, sort=name/-name/createdAt/-createdAt/id/-id.
- Company postings: q, isActive, sort=createdAt/-createdAt/id/-id.
- Drives: q, status, companyId, branchId, sort=registrationDeadline/-registrationDeadline/createdAt/-createdAt/id/-id.
- Announcements: q (escaped literal search), status, sort=createdAt/-createdAt.
- Applications: status, sort=id/-id. No arbitrary studentId ownership filter is accepted.

SQL timestamps are ISO UTC at whole-second precision (zero fractional milliseconds accepted); recruitment/announcement BSON timestamps support ISO UTC milliseconds. CGPA/SGPA and CTC accept at most two decimal places. Phone remains a bounded optional string rather than a new institutional numbering policy.

A rounds body contains `rounds:[{roundNumber,roundName,roundType,description?,mode,scheduledAt?,details?}]`, requiredDocuments?, additionalRequirements?, version?. Round numbers must be contiguous from 1, schedules nondecreasing when consecutive dates are set, and flexible keys/size bounded. Editing an existing changed document requires its current version from GET; stale versions return 409. An identical PUT retry returns the unchanged document/version, including after a lost response. Published drives require at least one round. SQL row locking serializes publish/edit validation; no cross-database atomicity is claimed.

Announcement audience is `{type:"all|branches",branchIds:[...]}`; all requires no ids, branches requires valid unique MySQL branch ids. Links are `{label,url}` with HTTP(S) URLs only. Published announcements require publishedAt. A null relatedDriveId is supported. Body is plain text; uploads/HTML rendering are absent.

Students never receive draft/archived drive details or inactive companies; absent/hidden resources return 404. Published-drive preconditions use the MySQL UTC clock, posting activity, complete eligibility, at least one branch and at least one Mongo round. After applications exist, eligibility cannot change (BR-13). Published deadlines cannot shorten (BR-14). Application status transitions reject invalid terminal/reversed moves with 409 and preserve history (BR-09/12).

During a Mongo outage, drive detail returns the MySQL data, `recruitment:null` and `warnings:[{code:"RECRUITMENT_DATA_UNAVAILABLE"}]`. Recruitment writes return 503 and leave the SQL drive unchanged. Draft deletion commits SQL first; failed Mongo cleanup returns `RECRUITMENT_CLEANUP_PENDING` and logs the drive id for later reconciliation. Do not blindly repeat the DELETE after a lost response; refetch the resource. General reconciliation remains unimplemented.

Phase 4 adds frontend authentication and workspaces using the implemented endpoints. Phase 5 adds submission, withdrawal and application/history detail as documented below. Reporting endpoints and operator reconciliation are documented in the final-phase sections below.

## Phase 4 client integration

The React client now uses the existing session/CSRF APIs and business endpoints. No backend endpoint, schema or response contract changes in this phase. The client preserves pagination metadata, warnings and 204 behavior. Student registration leads to sign-in. Login rotates CSRF; logout clears the client cache after server success. Backend roles and ownership remain authoritative. See architecture/phase-4-frontend.md for routes, query invalidation and deferred capabilities.

## Phase 5 student application endpoints

All three endpoints require an active session and strict positive integer path ids. Write endpoints require the current X-CSRF-Token and an exact configured Origin. Unknown body/query fields are rejected. Ownership always derives from the authenticated session.

| Method/path                             | Role                         | Body            | Result                                                                        |
| --------------------------------------- | ---------------------------- | --------------- | ----------------------------------------------------------------------------- |
| POST /placement-drives/:id/applications | Student                      | `{}` or no body | 201 application detail with initial `applied` history                         |
| PATCH /applications/:id/withdraw        | Student, own only            | `{}` or no body | 200 updated application detail/history                                        |
| GET /applications/:id                   | Own student or administrator | None            | 200 application/drive summary with ordered history, including archived drives |

Application detail fields: `id`, `studentId`, `driveId`, `status`, `appliedAt`, `updatedAt`, `driveTitle`, `driveStatus`, `jobTitle`, `companyName`, and `history`. Each history item contains `id`, `fromStatus` (null for initial submission), `toStatus`, `changedBy` (user id), `actorRole`, `remarks` (nullable) and `changedAt`. Timestamps are UTC. History is bounded by the terminal status graph and ordered by changedAt then id. A single SQL statement reads the application and history consistently. No hashes, emails, phone numbers or other students' profiles are projected. Official administrator remarks are visible to the owning student.

Submission checks a visible published drive, an unexpired deadline, a complete profile (name, enrollment, branch, graduation year, at least one semester), latest-semester eligibility, and no prior application. A guarded INSERT checks `UTC_TIMESTAMP() < registration_deadline` again at the actual write. Application creation and the first history event commit/rollback together. Duplicate races use the existing UNIQUE(drive_id, student_id) constraint; no client studentId/status is accepted. Withdrawn applications count as existing applications and cannot be resubmitted.

Withdrawal accepts only own applied/shortlisted applications and stores its history atomically with the status change. It does not re-evaluate eligibility or require the drive to remain open. Selected, rejected and withdrawn statuses are terminal. Administrator selection changes and student withdrawal serialize on the same application row. Archived drives stay hidden from the drive API; an owner can still read their application summary/history.

| Status / code                 | Trigger                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 401 UNAUTHENTICATED           | Missing/expired/inactive session                                                                           |
| 403 FORBIDDEN                 | Wrong role, CSRF or Origin                                                                                 |
| 400 VALIDATION_ERROR          | Invalid id, unknown request fields or nonempty write body                                                  |
| 404 NOT_FOUND                 | Missing/hidden drive, missing application, or another student's application                                |
| 409 CONFLICT                  | Completed/cancelled drive is not accepting applications                                                    |
| 409 DEADLINE_PASSED           | Deadline reached or passed, including at the guarded INSERT                                                |
| 409 PROFILE_INCOMPLETE        | Missing required own profile/academic fields; details use `profile.<field>`                                |
| 400 NOT_ELIGIBLE              | Failed backend criteria; details use `eligibility.MIN_CGPA`, `.BACKLOGS`, `.BRANCH`, or `.GRADUATION_YEAR` |
| 409 DUPLICATE_APPLICATION     | An application already exists, including withdrawn                                                         |
| 409 INVALID_STATUS_TRANSITION | Application cannot be withdrawn/changed from its current status                                            |
| 503 SERVICE_UNAVAILABLE       | Required MySQL unavailable                                                                                 |

These operations have no MongoDB dependency. The actual-outage test verifies submission, detail and withdrawal with Mongo stopped. Student UI applies no optimistic business update or automatic write retry; success invalidates application lists/details, drives and dashboard queries. This phase adds no one-student-one-offer restriction.

## Administrator reports

`GET /api/admin/reports/{overview,drives,companies,branches,statuses,participation}` requires an admin session. All accept optional `from`, `to` (inclusive UTC registration-deadline dates), positive `driveId`, `companyId`, `branchId`, `page` (default1), `limit` (default10,max100), `sort=id|-id`, and `format=json|csv`. Unknown input or reversed dates:400; anonymous:401; student:403; MySQL unavailable:503; CSV above10,000rows:413 REPORT_EXPORT_TOO_LARGE. Tables return data arrays with standard meta; overview returns aggregate counts, placementRate and recruitment roundTypes/requiredDocuments. CSV returns text/csv attachment, with formula-safe quoted cells. Mongo outage preserves overview SQL data with recruitment:null and REPORT_RECRUITMENT_UNAVAILABLE. See [report definitions](architecture/reporting.md) for denominators, projections and cohort semantics.
