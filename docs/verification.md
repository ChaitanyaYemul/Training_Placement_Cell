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
