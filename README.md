# College Training and Placement Cell Management System

A college DBMS project for organizing placement opportunities, student applications, recruitment schedules and announcements. **Phase 1 foundation and Phase 2 database architecture are implemented.** Authentication and student/admin business functionality remain deferred.

## Stack

Node **24.x LTS**, npm **11.x** (verified with Node 24.19.0 / npm 11.9.0). JavaScript ES modules, React 19, Vite 8, Tailwind CSS 4 using its official Vite plugin, React Router 7, TanStack Query 5, Axios 1; Express 5, Zod 4, Pino 10, Helmet 8, CORS 2, express-rate-limit 8. Database clients: **mysql2 3** promises (raw parameterized SQL, no ORM) and **Mongoose 9**. Database instances tested: **MySQL 8.4.11** and **MongoDB 8.0.34**. MySQL minimum is 8.0.16; 8.4 LTS is recommended.

Tooling: ESLint 10, Prettier 3, Vitest 5, React Testing Library/MSW, Supertest, Playwright 1. Exact resolutions are committed in the workspace `package-lock.json`. No AI/ML functionality, AI SDK, ORM or UI component library is included.

## Quick start

From the repository root:

```sh
nvm use # optional if Node 24 is already active
npm ci
npm run dev
```

Safe local defaults start the responsive frontend (port 5173) and public health-only API (port 3000). Student/admin pages are clearly labeled public layout previews, not authenticated dashboards. The browser requests `/api/health` through the Vite proxy, with Axios/query hooks and no page reloads for in-app navigation. The API health response remains process liveness, with `databases: "not-configured"`: the API server does not yet open database connections. Database modules are exercised by explicit CLI commands and integration tests.

Optional local files: copy `frontend/.env.example` to `frontend/.env` and `backend/.env.example` to `backend/.env`, preserving existing files. Vite reads the frontend file; Node loads the backend file. Root .env is not loaded. Never commit credentials or put secrets into VITE_* variables. Active app settings are NODE_ENV, PORT, CLIENT_ORIGIN (comma-separated origins); frontend VITE_API_BASE_URL defaults to `/api`, and API_PROXY_TARGET defaults to the backend on port 3000.

## Database architecture

MySQL owns 11 normalized domain tables: users, students, admins, branches, academic_records, companies, job_postings, placement_drives, drive_eligible_branches, student_applications, application_status_history. Seventeen immutable migrations create these tables, four views and two history-deletion guards. Constraints and foreign keys enforce integrity; a checksum ledger/advisory lock makes reruns safe and interrupted DDL visible. Transactions protect multi-statement seed/test work.

MongoDB owns recruitment_processes (embedded rounds/schedules/checklists/drive-specific process requirements) and placement_announcements. Bounded Mongoose models and `$jsonSchema`/`$expr` validators enforce document rules even on raw writes; explicit indexes include a unique drive reference and multikey schedules. MySQL references cannot be enforced by MongoDB foreign keys; the sample seed service checks its MySQL references before writing. There is no shared ACID transaction across databases.

Company master records, student data, applications and history are never duplicated into MongoDB. See the [ER diagram](docs/er-diagram.md), [MongoDB schema](docs/mongodb-schema.md), [ownership decisions](docs/architecture/database-ownership.md), and [executed DBMS concepts](docs/dbms-concepts.md).

For existing development database instances, configure backend/.env securely and run:

```sh
npm run db:check -w backend
npm run db:migrate -w backend
npm run mongo:setup -w backend
npm run db:seed -w backend
```

The seed creates reference/sample branches, a fictional company and a posting. It creates no accounts or password hashes. Optional Mongo samples require existing valid drive/admin ids; details are in the [setup guide](docs/setup-guide.md).

For actual isolated test instances with Docker available:

```sh
npm run test:db:services -w backend
npm run test:db -w backend
```

The helper creates ignored test configuration with a random local credential if absent and starts loopback-bound MySQL/MongoDB containers. It never overwrites existing configuration. No Docker Compose file is added. Alternatively configure existing disposable instances through backend/.env.test.example. **Database tests destroy and recreate only the explicitly configured `_test` databases.** The guard rejects all other names before connecting. Do not point tests at data you need to retain.

## Commands and checks

```sh
npm run check                         # lint, format check, ordinary tests, frontend build
npm run test:db -w backend             # real MySQL/MongoDB tests, explicit opt-in
npm run test:integration -w backend    # existing HTTP API tests
npm audit
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Use `npm run format` to format editable files; AGENTS.md is excluded and unchanged. On machines without preinstalled Chromium, use Playwright's supported installer. Application tests do not substitute for database tests. Check outcomes and environment-specific limits are in [verification notes](docs/verification.md).

Frontend scripts: dev, build, preview, lint, format, test. Backend scripts: dev (`node --watch`), start, lint, format, test, test:integration, test:db, test:db:services, db:check, db:migrate, db:seed, db:schema, mongo:setup, mongo:seed. `admin:create` and `reconcile` remain reserved commands that deliberately exit 1 without changing data.

`npm run dev -w backend` and `npm run dev -w frontend` work in separate terminals; `npm start -w backend` starts the health API without watching. `npm run build` outputs frontend/dist. `npm run preview -w frontend` previews static files without the development API proxy; deployments need a real API reverse proxy and SPA fallback.

## Structure and next phase

- `frontend/src`: existing API/hooks/components/layout/routes and public preview pages.
- `backend/src`: configuration, models, repositories, transaction/migration/seed foundations; health API assembly remains intact.
- `backend/scripts`: explicit schema, seed, connectivity and test-service commands.
- `database/mysql`: immutable migrations, generated schema, repeatable seeds and executable query demonstrations.
- `database/mongodb`: collection validation/index definitions, sample documents and aggregation demonstrations.
- `tests/backend`, `tests/db`, `tests/e2e`: ordinary backend, real database and browser verification.
- `docs`: design, schema/ER, DBMS concepts, setup and evidence.

Stop after Phase 2. No authentication, role enforcement, live student/admin data, business endpoints, automatic drive publication, application transitions, production deployment or general reconciliation is claimed. Phase 3 and later work requires approval. AGENTS.md and its status table remain unchanged; this README and verification notes record the verified implementation.
