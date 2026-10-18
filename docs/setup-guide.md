# Phase 3 authentication setup

Install from the root with `npm ci`. Configure backend/.env with actual local MySQL credentials plus unique SESSION_SECRET and CSRF_SECRET values (at least 32 characters, generated securely). The provided example values are placeholders and cannot be used to start authentication. Set NODE_ENV appropriately, CLIENT_ORIGIN to exact allowed origins, SESSION_MAX_AGE_MS for idle expiry and TRUST_PROXY_HOPS only for your actual reverse-proxy path.

Apply `npm run db:migrate -w backend` before starting; new migration 0018 adds the persistent session table without changing historical migrations. Then `npm run dev` starts Vite and the authentication API. The runtime requires real MySQL access. GET /api/health remains process liveness, with no per-request database-readiness guarantee.

For test services run `npm run test:db:services -w backend`. If backend/.env.test already exists it is preserved. Ensure this ignored test file contains secure SESSION_SECRET/CSRF_SECRET bindings as well as its disposable database settings. Run `npm run test:db -w backend` and `npm run test:auth -w backend` sequentially because they reset the same test schemas. Each suite refuses names not ending in `_test`. No authentication integration test uses MemoryStore.

For admin provisioning set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD securely for one `npm run admin:create -w backend` invocation, then clear those variables. The CLI validates inputs, hashes the password and transactionally creates the user/admin profile. Never pass passwords as command-line flags or create admin accounts via public registration.

`npm run check` runs ordinary tests, lint, formatting and the frontend build. Browser smoke checks need the backend environment configured and free ports 3000/5173. Use the preinstalled Chromium override documented below. See security.md for CSRF token sequencing and secure proxy/cookie configuration.

## Phase 2 database setup reference

# Local development and database setup

Use Node 24.x and npm 11.x. From the repository root, run `npm ci`. `npm run dev` still starts the frontend and the public health-only Express API without requiring databases. The existing React/Express architecture and API contract remain unchanged.

## Development database configuration

Provision MySQL 8.4 LTS (minimum 8.0.16; MariaDB is not supported by these migrations) and MongoDB 8.0 or a newer supported release. Create an empty MySQL application database with utf8mb4/utf8mb4_0900_ai_ci using your database administration tools; the migration runner intentionally does not create databases.

Copy `backend/.env.example` to `backend/.env` and enter your local values securely. Never commit either actual credentials or `.env`. Commands run from the root use `-w backend` to load backend/.env. `MYSQL_*` settings are required for MySQL commands; `MONGODB_URI` must include an explicit database path for Mongo commands. Health-only startup needs neither. Use a migration/schema-owner account for schema operations and a separate least-privileged runtime account later. Database/authentication credentials never belong in frontend VITE_* variables.

```sh
npm run db:check -w backend
npm run db:migrate -w backend
npm run db:migrate -w backend # repeat run is a no-op
npm run mongo:setup -w backend
npm run mongo:setup -w backend # repeat run preserves documents
npm run db:seed -w backend
npm run db:seed -w backend # preserves existing data
```

`db:check` performs real connectivity/version checks but does not prove migrations or application authorization. MySQL seeds create two branches, a fictional company and one posting. They do not create users, students, administrators, drives, applications or password hashes. This avoids inventing authentication/hashing before Phase 3.

Mongo samples need an already existing MySQL drive and active-admin user. For a development database where those records legitimately exist, run:

```sh
npm run mongo:seed -w backend -- DRIVE_ID AUTHOR_USER_ID
```

Replace both labels with positive integer ids. Missing references are rejected before Mongo writes; existing documents are preserved. With only this phase's reference seed, those ids do not exist, so defer this optional command. Real integration tests create isolated test fixtures and exercise Mongo sample seeding. All sample seed commands refuse NODE_ENV=production.

`npm run db:schema -w backend` regenerates mysql/schema.sql from migrations. Never edit an applied/committed migration. See database-ownership.md for interrupted-DDL recovery; MySQL DDL does not roll back as a whole batch.

## Real integration tests

Database tests are explicit: `npm test` runs ordinary component/backend tests; `npm run test:db -w backend` runs the real MySQL/MongoDB suite. No test is silently skipped or backed by an in-memory substitute. Both names must end in `_test`; the safety check happens before destructive setup. The suite **drops and recreates the configured MySQL test database and drops the Mongo test database**. Never configure development/production data, even under a misleading test name. The test-only MySQL user needs create/drop privileges for that disposable schema.

### Optional local Docker test services

Docker is used here only to run isolated actual database instances, with no Compose configuration added. With a running Docker daemon:

```sh
npm run test:db:services -w backend
npm run test:db -w backend
```

The helper securely generates ignored `backend/.env.test` if missing, using a random local MySQL root password. It preserves an existing file; compatible settings must be NODE_ENV=test, loopback hosts, a disposable database ending in `_test`, and a local root test user. Existing custom/remote settings should use the manual path below. Docker credentials are passed through a mode-0600 temporary environment file, never command-line password arguments; temporary files are removed afterward.

The containers are named `placement-phase2-mysql` and `placement-phase2-mongo`, with default bindings **127.0.0.1:3307** and **127.0.0.1:27018**. The helper pulls digest-pinned official MySQL 8.4 and MongoDB 8.0 images, reuses compatible existing containers, waits for real database checks, and never deletes an existing container. Ports/images that conflict cause a failure rather than replacement. No host directory is mounted. MongoDB is unauthenticated only in this local, loopback-bound disposable test instance. Never expose it to public interfaces or use this test helper for a deployment.

Rerun the helper after restarting the machine. Live database processes must not be assumed to survive cloud snapshots. To stop only these test services, run:

```sh
docker stop placement-phase2-mysql placement-phase2-mongo
```

### Existing database instances

Copy `backend/.env.test.example` to `backend/.env.test` and set values for your dedicated instances. Preserve any existing file, and use secure values. Do not load `.env` instead. Then run `npm run test:db -w backend`. The generated local file can be reused on this machine; no credential is committed. The example lists configuration names only; placeholder passwords do not establish connectivity.

Database test cases reset the dedicated schemas, run migrations and seeds, verify repeatability, test SQL constraints/FKs/delete guards/rollback/concurrent uniqueness, reject invalid Mongo documents through models and raw writes, and run real aggregation/EXPLAIN demonstrations. Latest EXPLAIN output is written to ignored `test-results/database-explain.json`; documentation records the observed fixture-scale plans.

## Application checks

```sh
npm run check
npm run test:integration -w backend
npm audit
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

The Chromium override applies to this cloud machine's preinstalled browser; on another machine install Chromium using Playwright's verified installer instead. Browser download restrictions remain separate from application correctness. Keep ports 3000 and 5173 free when Playwright launches the apps. `npm run dev -w backend` and `npm run dev -w frontend` also work separately. Vite proxies `/api` to port 3000; changing ports requires corresponding proxy/CORS configuration changes.

If npm's default cache is unwritable in a sandbox, prefix commands with `NPM_CONFIG_CACHE=/tmp/placement-npm-cache`; no verification is disabled. `admin:create` and `reconcile` remain explicit non-working reservations. No authentication, protected endpoints, student/admin business features, production deployment or cross-database reconciliation is implemented in Phase 2.
