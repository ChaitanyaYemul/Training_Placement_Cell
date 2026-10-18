# Backend API — Phase 3

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

Application submission, withdrawal, report endpoints, authentication UI and complete student/admin frontend workflows are not implemented in this phase. Existing test application rows are isolated fixtures; do not interpret their presence as an implemented apply flow.
