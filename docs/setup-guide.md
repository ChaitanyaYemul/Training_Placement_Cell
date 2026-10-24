# Local development and verification

## Prerequisites

Use Node 24.x LTS, npm 11.x, MySQL 8.4 LTS (minimum 8.0.16; MariaDB is not supported), and MongoDB 8.0 or a supported newer release. Run `npm ci` at the repository root. The lockfile remains unchanged in Phase 4.

## Development settings

Create an empty MySQL development database using administration tools. Copy `backend/.env.example` to ignored `backend/.env` and configure actual database bindings. Generate unique SESSION_SECRET and CSRF_SECRET values securely (at least 32 characters; example placeholders are rejected). Do not print or commit credentials. The full backend requires both databases at cold startup.

Set CLIENT_ORIGIN to the exact browser origin, for example `http://localhost:5173`. If you also use `http://127.0.0.1:5173`, include it in the comma-separated allowlist. Keep a consistent hostname while signing in; cookies are host-specific. Development uses same-origin `/api` through Vite. Frontend settings are optional: VITE_API_BASE_URL defaults to `/api`, API_PROXY_TARGET defaults to `http://127.0.0.1:3000`, and VITE_INSTITUTION_TIMEZONE defaults to `Asia/Kolkata`. No credentials belong in VITE variables.

Use schema-owner credentials for initialization, then a separate runtime MySQL account limited to SELECT/INSERT/UPDATE/DELETE on the development schema. The migration account requires DDL privileges; the runtime account does not. For local Docker networking, limit its host grant to the observed application connection source, not a wildcard. Bind database ports only to loopback. MongoDB production authentication and privileges must be configured by the operator; the disposable local test Mongo service is not a deployment configuration.

```sh
npm run db:migrate -w backend
npm run mongo:setup -w backend
npm run db:seed -w backend
npm run db:check -w backend
npm run dev
```

Workspace backend commands load backend/.env. Migrations must be rerunnable without changing historical SQL files. Mongo schema setup preserves documents. Runtime auto-creation is disabled. The reference seed creates branches and fictional companies/postings, without user accounts or password hashes. Sample seed commands refuse production. Optional Mongo seeding requires real existing drive/admin references (`npm run mongo:seed -w backend -- DRIVE_ID AUTHOR_USER_ID`).

Express listens on port 3000; Vite listens on 5173. Verify actual readiness with `/api/health` on both ports, then exercise authentication; health is process liveness and does not assert database readiness. `npm run db:check -w backend` independently verifies real database connectivity.

## Accounts and frontend flows

Open `/register` to create a student, then sign in on `/login`. Complete `/student/profile` and save semester records separately. Company/drive lists are paginated; drive details display eligibility provided by the backend, recruitment rounds, schedules and informational document checklists. Documents are not uploaded. Existing application statuses are available; submission, withdrawal and history-detail APIs are deferred.

Provision administrators through `npm run admin:create -w backend` using secure operator-supplied ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD environment bindings; clear them afterward. Never pass a password as a command-line flag. Administrator registration is unavailable in the UI/API. The admin workspace manages companies and their postings, drives, rounds/schedules, announcements and selection statuses. Posting ids shown under a company's job list identify the posting when creating a drive. A drive stays draft until its prerequisites are met. Recruitment saves and publication are separate operations.

Production cookies require HTTPS, NODE_ENV=production and the correct TRUST_PROXY_HOPS for the actual trusted proxy path. Preserve exact-origin credentialed CORS and CSRF. See security.md.

## Disposable integration-test services

Configure backend/.env.test from its example with dedicated disposable MySQL/MongoDB names ending in `_test`, including session/CSRF secrets. Alternatively, with Docker available:

```sh
npm run test:db:services -w backend
```

The helper securely generates a missing mode-0600 `.env.test`, preserves existing database bindings, adds missing test session/CSRF bindings, and starts digest-pinned actual MySQL/MongoDB containers named placement-phase2-mysql and placement-phase2-mongo. Default ports are loopback 3307 and 27018. It preserves existing containers and rejects incompatible images/ports or nonlocal/custom settings. For external dedicated test instances use the manual `.env.test` configuration instead.

These live services may need restarting after cloud snapshots. To stop only those services use `docker stop placement-phase2-mysql placement-phase2-mongo`. Never use their unauthenticated local Mongo configuration as a public deployment.

## Checks

```sh
npm run check
npm run test:backend -w backend
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

`check` runs lint, formatting, ordinary frontend/backend tests and the frontend build. `test:backend` runs ordinary, database, authentication and business suites sequentially. The database suites **drop/recreate only their configured disposable `_test` schemas**. They must not run concurrently with each other or E2E. For focused checks, use `test:db`, `test:auth`, or `test:business` in the backend workspace.

E2E explicitly loads backend/.env.test, resets those disposable schemas, installs validators and creates fictional test-only accounts. Its two preset accounts are admin-test@example.edu and student-test@example.edu, with the test-only password defined in tests/e2e/helpers.js. They are not created in development. Playwright starts/stops the real backend and Vite, with ports 3000/5173 free. The auth attempt limit is configured to its supported maximum for the suite; CSRF, Origin checks, roles, persistent sessions and the global rate limiter remain enabled. The suite waits for rate-limit capacity when necessary. Run it with a verified Playwright Chromium installation or the executable-path override above.

Optional `npm run test:outage -w backend` actually stops/restarts only the helper-created local Mongo test container, then verifies degraded SQL-backed reads, 503 writes and recovery. Run it separately. It does not support external test Mongo instances.

If npm's cache is unwritable, use `NPM_CONFIG_CACHE=/tmp/placement-npm-cache`; no checks are disabled. The known session-store upstream mysql2 exact-pin mismatch can make `npm ls mysql2` flag the documented patched override even though installation, audit and real session tests succeed.

Production deployment, reports, application submission/withdrawal/history-detail APIs and general reconciliation remain deferred. `reconcile` is still an explicit reservation. Database schema regeneration is available through `npm run db:schema -w backend` only when migrations intentionally change.
