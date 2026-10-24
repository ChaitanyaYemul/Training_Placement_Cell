# Verification record

## Phase 1 — historical

Verified in the cloud instance using Node 24.19.0 and npm 11.9.0:

| Command / check                                                           | Result                                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `NPM_CONFIG_CACHE=/tmp/placement-npm-cache npm ci`                        | Passed; clean lockfile installation                                               |
| `npm run check`                                                           | Passed: lint with zero warnings, Prettier check, tests, production frontend build |
| `npm test` (part of check)                                                | 3 frontend component tests and 9 backend tests passed                             |
| `npm run test:integration -w backend`                                     | 6 HTTP integration tests passed (subset of the 9 backend tests)                   |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`  | 2 live browser tests passed, at 375px and 1280px                                  |
| `npm start -w backend` + direct health request                            | Started successfully; HTTP 200, database status `not-configured`                  |
| `npm run dev` (started by Playwright)                                     | Both applications started; real health request succeeded through Vite proxy       |
| `npm audit`                                                               | Zero vulnerabilities                                                              |
| `git diff --check`                                                        | Passed                                                                            |
| `cmp` against uploaded AGENTS.md                                          | Identical bytes                                                                   |
| `git check-ignore` for root/workspace `.env`, node_modules, frontend/dist | All ignored                                                                       |
| Reserved DB/admin commands                                                | Each failed with expected status 1 and performed no work                          |

Initial issues corrected: unwritable default npm cache, incompatible legacy React lint plugin, and invalid-origin validation throwing rather than returning a validation error. ESLint 10 now uses a compatible JSX-aware parser. No lint rules or test assertions were disabled to obtain passing results.

Playwright's Chromium download was attempted but blocked with HTTP 403 (`Domain forbidden` for `cdn.playwright.dev`). Browser checks succeeded using the already installed Chromium; the supported executable-path override is documented. No verification bypass was used.

GitHub API discovery (`gh api repos/ChaitanyaYemul/Training_Placement_Cell`) returned Forbidden in this environment. Git HTTPS access is separate and was verified by fetching `main`. GitHub delivery status is reported separately in the final response; no PR is claimed here.

Database connectivity, schema validation, migrations, seeds, sessions/authentication, business functionality, and production deployment are not implemented or tested. The status table in AGENTS.md remains untouched as requested.

## Phase 2 — actual database verification

Implemented on a new branch from merged main (`1570087`). AGENTS.md is unchanged. Actual isolated database instances were used: **MySQL 8.4.11** and **MongoDB 8.0.34**. Official Docker image pulls verified their content digests. Credentials were generated locally and retained only in ignored, mode-0600 backend/.env.test; none are committed. Test services bind host ports only to loopback.

| Command / check                                                          | Result                                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `NPM_CONFIG_CACHE=/tmp/placement-npm-cache npm ci`                       | Passed with the updated committed-lockfile dependency tree                                                                                |
| `npm run test:db:services -w backend`                                    | Passed both reuse and fresh-container startup; real version/ping checks succeeded                                                         |
| `npm run check`                                                          | Passed lint (zero warnings), formatting, 3 frontend tests, 13 ordinary backend tests and frontend production build                        |
| `npm run test:db -w backend`                                             | **32 real database tests passed**, across three test files; no skipped/in-memory substitutes                                              |
| `npm run db:check -w backend`                                            | Passed actual MySQL/MongoDB connectivity; MySQL session timezone +00:00                                                                   |
| `npm run db:migrate -w backend` (twice)                                  | Passed; existing migrations remained unchanged and no pending migrations were reapplied                                                   |
| Clean migration application inside DB tests                              | All 17 migrations applied to empty MySQL test schemas; repeated calls were no-ops                                                         |
| `npm run mongo:setup -w backend` (twice)                                 | Passed; validators/indexes preserved data on rerun                                                                                        |
| `npm run db:seed -w backend` (twice)                                     | Passed; no duplicate sample postings or overwritten local values                                                                          |
| `npm run mongo:seed -w backend -- 1 1`                                   | Passed against valid test fixture drive/admin references; service tests additionally verify invalid-reference rejection and repeatability |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | **2 browser tests passed** at 375px and 1280px; existing health/API proxy and navigation remain functional                                |
| `npm audit`                                                              | Zero vulnerabilities                                                                                                                      |
| Schema snapshot consistency test                                         | schema.sql exactly matched ordered migration contents                                                                                     |
| Database config/production seed guards                                   | Executed tests reject unsafe database names, malformed names, unsafe flexible keys and production seeding                                 |

CLI commands that load backend/.env were exercised through a temporary, exclusively created copy of the local test settings. It was removed afterward. Existing user configuration was not overwritten. Database tests recreated only the specifically configured databases ending in `_test`; no development/production database was touched. The fresh-container startup check removed/recreated only the task's own disposable database containers.

SQL tests exercise PK/UNIQUE/NOT NULL/ENUM/CHECK constraints, orphan rejection, restrictive/cascading foreign-key behavior, BR-12 delete guards, failed/successful transactions, four views, UTC settings, all required index definitions, concurrent uniqueness, checksum drift, dirty migration detection and repeatable seeds. MongoDB tests exercise Mongoose and raw database validation, actual BSON dates/integer ids, unique indexes, contiguous rounds/schedule order, unsafe nested keys, object/array/document limits, announcements, optimistic concurrency and checked sample references.

Eight SQL demonstrations and three MongoDB aggregations were executed with asserted results. Actual EXPLAIN output is captured in ignored test-results/database-explain.json; docs/dbms-concepts.md records the observed plans, including cases where the optimizer selected an alternative index or scanned a tiny fixture table.

No database-layer check remains blocked in this instance. Remote/production database connectivity, authentication/session storage, backend role enforcement, actual placement business services, cross-database reconciliation and production deployment are not implemented or verified. The Express health endpoint remains process liveness and does not assert database readiness. The earlier GitHub API access limitation and Chromium download restriction are external to database verification; delivery status is reported separately in the final response.

## Phase 3 authentication commit

The independently executable `npm run test:auth -w backend` passed 14 integration/security tests against actual MySQL-backed sessions. It covers Argon2id, transactional registration, ignored admin-role input, duplicate accounts, validation/injection, CSRF including multibyte-token rejection, session regeneration/expiration/logout, generic login errors, inactive accounts, authoritative roles, rate limiting, secure cookies and actual operator CLI provisioning. Full Phase 1/2 regressions and startup checks are recorded after their execution. No business API is included in this commit.

Authentication commit regression results: clean npm ci, npm run check (3 frontend + 13 ordinary backend tests, lint/format/build), 32 real database tests, 14 authentication tests and 2 browser/startup tests all passed. npm audit reports zero vulnerabilities after the mysql2 override and clean lockfile refresh. Runtime module resolution confirms that the session store uses mysql2 3.24.6. npm ls mysql2 reports an upstream exact-pin range conflict for this workspace override; installation, audit and actual session-store tests pass with the patched driver.

## Phase 3 business API commit (separate from authentication)

Authentication was committed as 80f7739 only after its own checks passed. Business APIs and their tests were then implemented in the following commit; authentication was not amended/squashed into them. No AGENTS.md, frontend implementation or historical migration was changed. Migration 0018 belongs only to the authentication commit.

Verified with actual MySQL 8.4.11 and MongoDB 8.0.34:

| Command/check                                                            | Result                                                                                                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                          | Passed lint, formatting, 3 frontend tests, 19 ordinary backend tests, frontend production build                                                               |
| `npm run test:backend -w backend`                                        | Passed sequential ordinary, database, authentication and business suites                                                                                      |
| `npm run test:db -w backend`                                             | 33 real database tests passed (includes corrected NULL announcement-reference regression)                                                                     |
| `npm run test:auth -w backend`                                           | 14 real-MySQL authentication/security tests passed again                                                                                                      |
| `npm run test:business -w backend`                                       | 14 HTTP integration cases passed across five focused files, using actual MySQL and MongoDB                                                                    |
| `npm run test:outage -w backend`                                         | 1 test passed after actually stopping/restarting the disposable Mongo container; degraded SQL read, HTTP 503 write, preserved SQL state and recovery verified |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | 3 browser/startup tests passed, including actual cookie/CSRF login/profile/logout through Vite proxy                                                          |
| `npm run test:db:services -w backend`                                    | Existing test services verified; additive generation of missing test session/CSRF bindings checked without altering existing database bindings                |
| `npm audit`                                                              | Zero vulnerabilities with the documented patched mysql2 override                                                                                              |

Business cases enumerate every implemented admin endpoint for anonymous 401/student 403, test ownership/CSRF/origin checks, company/posting CRUD and FK restrictions, strict unknown/filter/id validation, own profile/academic replacement, draft/archive visibility, publication preconditions/deadline/eligibility locks, recruitment validation/version conflicts/idempotent retries, announcement visibility/audiences/links/NULL references, own applications and transactional administrator status history. A controlled Mongo adapter-failure test additionally verifies draft preservation and pending orphan cleanup; this is distinct from the real container-outage test.

The initial integration run found an actual Phase 2 model mismatch: relatedDriveId NULL was rejected by its integer validator despite the BSON schema permitting NULL. The model and regression tests were corrected. Invalid URL inputs are also verified to return 400 instead of throwing a URL parsing error. No failing assertion was disabled or skipped.

Remaining scope: no student application submission/withdrawal endpoint, report API, frontend authentication screens, general orphan reconciliation, password reset/change or production deployment. Cold startup requires both databases; runtime Mongo outage degradation is verified. The session-store upstream pin still causes npm ls to flag an overridden range conflict, while clean npm ci, runtime module resolution (mysql2 3.24.6), actual session tests and audit all succeed. GitHub PR capability is checked separately during delivery.

## Phase 4 — frontend authentication and workspaces

Verified on 24 October 2026 with Node 24.19.0, npm 11.9.0, real MySQL 8.4.11 and MongoDB 8.0.34. The feature branch starts from remote main `72fcbc3`, which contains both Phase 3 commits. Initial working tree was clean. The user's approved Phase 4 scope includes frontend authentication and student/admin workspaces against the existing APIs; it does not include the deferred application, report or reconciliation APIs.

| Executed command / check                                                 | Result                                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `git ls-remote origin refs/heads/main`                                   | Confirmed `72fcbc3046b9ea3a14fb372aaae1b91566922468`, matching the starting checkout                                            |
| `npm run test:db:services -w backend`                                    | Actual local MySQL/MongoDB readiness verified; existing test bindings preserved                                                 |
| `npm run check`                                                          | Passed lint with zero warnings, formatting, **21 frontend tests**, **19 ordinary backend tests**, and frontend production build |
| `npm run test:backend -w backend`                                        | Passed sequentially: 19 ordinary backend, **33 database**, **14 authentication**, and **14 business API** tests                 |
| `npm run test:outage -w backend`                                         | **1 passed**; actually stopped/restarted the disposable Mongo container and verified degradation/recovery                       |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | **9 passed** in one final run, using the real API, MySQL sessions, MongoDB and Vite proxy                                       |
| `npm run db:check -w backend`                                            | Real development-schema connectivity verified with the new restricted local MySQL runtime user; session timezone +00:00         |
| `npm run dev` and HTTP health/SPA requests                               | Both servers started; direct and Vite-proxied health returned 200/success; `/login` served successfully                         |
| `git diff --check`                                                       | Passed                                                                                                                          |
| Protected/generated path checks                                          | backend/.env, backend/.env.test, frontend/dist and test-results are ignored; both environment files are mode 0600               |
| Scope comparison                                                         | AGENTS.md, backend implementation, all database files and package-lock.json are unchanged                                       |

There are **111 distinct passing tests** in those final suites: 21 frontend + 80 backend + 1 actual outage + 9 browser. The ordinary backend suite is included in both `check` and `test:backend`; it is counted once here. No tests were skipped, weakened or replaced with in-memory database substitutes. Frontend component/API tests use MSW for the browser HTTP boundary; the database, auth, business, outage and browser suites use actual databases.

Frontend tests cover anonymous/role redirects, service errors, student-only registration, accessible field errors, logout cache clearing, failed logout retaining state, expiry detected through business/auth requests, stale-response cancellation, preventing writes after a session change during CSRF bootstrap, token rotation and non-replay of failed writes, pagination/retry/empty states, profile query invalidation, partial recruitment warnings, preserved conflicting edits, explicit latest-version loading and timezone/deadline precision.

Browser checks cover responsive public navigation; real cookie/CSRF login and ownership/role rejection; registration and sign-in; profile/academic saves without document navigation; company/posting/drive/round creation and publication; administrator selection changes; announcement publication visible in a separate student session; student/admin route separation; mobile and desktop overflow; company editing/deactivation/deletion; and dialog focus wrapping, Escape dismissal and no-reload list refresh. Page errors fail the browser fixture. Screenshots of fictional test dashboards were captured and inspected at 375px/1280px.

The E2E configuration now loads `.env.test` explicitly and resets only the validated disposable `_test` databases. It creates fictional test-only accounts, starts/stops both servers and preserves CSRF, Origin checks, persistent sessions, roles and the global rate limiter. Its configured authentication attempt limit uses the existing supported setting. Capacity waits account for most of the 2.1-minute final run; security middleware was not bypassed. Do not run E2E and database suites concurrently.

Initial verification found a real field-label issue (hints contributed to accessible names), native dialog Tab wrapping that needed explicit handling, and a potential timestamp truncation when editing unrelated drive fields. These are corrected and tested. The first sandboxed backend run could not open a local socket; rerunning with local network access enabled passed without code/security changes. Test synchronization was corrected to await navigation/server results instead of reading URLs before saves completed.

Local development setup created separate `placement_dev` schemas, applied the existing migrations/validators and reference seeds, and wrote an ignored mode-0600 backend/.env with fresh session/CSRF secrets. No development accounts were seeded. The runtime MySQL account is limited to SELECT/INSERT/UPDATE/DELETE on that schema and the observed local Docker gateway source. Automatic approval review rejected an initial wildcard-host account proposal; the narrower observed-host grant was accepted and verified. No credential value entered Git or this report.

No versioned schema/API changes or dependency changes were needed. `npm ci` and `npm audit` were not rerun in Phase 4 because the installed dependency tree and lockfile were unchanged; earlier audit results above are historical, not a new claim. Historical migration files and AGENTS.md remain untouched. Setup, security, API-consumer and frontend architecture documentation now describe the implemented UI.

Remaining scope: application submission/withdrawal, application-history details, report APIs/UI, general reconciliation, password reset/change, notifications/file storage and production deployment. Local testing does not establish production connectivity or deployment readiness.

## Phase 5 — student application workflow

Implemented from the clean Phase 4 checkout `ed2597d` on `feat/student-applications`. The implementation plan was stated before changes and executed under the user's instruction to proceed without another approval. The API implementation and its real-database tests are committed separately as `9d0f4c1`; frontend integration and current documentation follow in a separate commit.

New behavior: student-only application submission and withdrawal; owner/admin application detail with ordered history; application/drive/dashboard cache invalidation; confirmations and profile/duplicate recovery links; permanent withdrawal; and preserved archived-drive history. Existing profile, academic, company/drive, recruitment and announcement functionality remains covered by regressions. There is no new one-student-one-offer restriction.

| Executed command                                                         | Final result                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run test:db:services -w backend`                                    | Actual MySQL 8.4.11 / MongoDB 8.0.34 ready; existing settings preserved                                                              |
| `npm run check`                                                          | Lint with zero warnings, formatting, **26 frontend tests**, **19 ordinary backend tests**, and production frontend build passed      |
| `npm run test:business -w backend`                                       | **38 integration cases passed**, including 24 new application/integrity cases                                                        |
| `npm run test:backend -w backend`                                        | **104 passed** sequentially: 19 ordinary + 33 database + 14 authentication + 38 business                                             |
| `npm run test:outage -w backend`                                         | **1 passed** after actually stopping/restarting MongoDB; submission, detail/history and withdrawal succeeded while Mongo was stopped |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | **10 passed in one final run**, using real sessions/databases and the Vite proxy                                                     |
| `git diff --check`                                                       | Passed                                                                                                                               |
| Scope comparison                                                         | AGENTS.md, all database definitions/migrations and package-lock.json unchanged                                                       |

**141 distinct tests passed:** 26 frontend + 104 backend + 1 actual outage + 10 browser. Repeated ordinary/business runs are counted once. No skips or security bypasses were added. Dependencies and schema did not change, so npm ci/audit and new schema migrations were not needed; historical audit results above are not a new audit claim.

The real-MySQL application tests verify BR-01…05, BR-09/10/15/16 and A-07/A-11: own identity and ordered initial history; anonymous/wrong-role/CSRF/Origin rejection; strict body/id/query validation; five missing-profile cases; all four eligibility failures; latest-semester evaluation and exact CGPA/backlog boundaries; draft/archive hiding; completed/cancelled rejection; deadlines at/past the database clock; duplicate races; final withdrawal; selected/rejected protection; history retained after archive; and later academic edits not revoking applications.

Concurrency/integrity cases use actual SQL transactions and deterministic barriers: two simultaneous submits yield one row/initial event and a duplicate 409; a failed initial history operation rolls back the new application; a failed withdrawal transaction rolls back both status/history; concurrent selection/withdrawal commits one terminal transition; an academic edit committed while apply waits is used for eligibility; a lifecycle change committed while apply waits prevents acceptance; and the guarded INSERT rejects a deadline reached after earlier checks. No timing-dependent sleeps replace these assertions.

Frontend tests verify safe empty request bodies, no resubmission controls, authoritative rejection/profile recovery, successful withdrawal refreshing status/history and removing actions, and escaped history text with archived context. Browser flows execute registration → profile → academic records → eligible drive → submit → application/history → withdraw → permanent no-reapply UI without document navigation. A separate student/admin flow submits through the browser, shortlists/selects through the admin UI, reads official remarks/history, archives the drive, retains the owner's history on mobile and rejects a different student. Existing admin CRUD/publication, announcement, responsive and keyboard-dialog checks all pass. The mobile history screenshot was inspected.

The initial cross-session browser assertion expected an immediate push update. The test now uses the supported Refresh action before asserting another session's status change; the application continues to use polling/focus/explicit refresh, with no unapproved socket dependency. The final 3.2-minute browser run includes capacity waits under the real global rate limiter. CSRF, Origin checks, roles and persistent sessions remained enabled.

API/security/DBMS/setup documentation and the Phase 5 architecture/plan describe the new endpoints, lock order, error codes, transaction boundaries, query invalidation and user-visible limitations. The existing UNIQUE/FK/index/history guards are reused. There is no MySQL/Mongo cross-database transaction or Mongo dependency for applications.

Remaining work is reports, general reconciliation, password reset/change, notifications/file storage and production deployment. Local verification does not claim production readiness. All environment files and generated artifacts remain ignored; no credentials or real student data were committed.
