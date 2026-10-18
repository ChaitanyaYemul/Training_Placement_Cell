# College Training and Placement Cell Management System

A college DBMS project for coordinating placement opportunities, student applications, recruitment schedules, and announcements. This commit implements **Phase 1: project initialization only**. It is not a production placement portal.

## Implemented

- Responsive overview and clearly labeled student/admin layout previews, using client-side navigation.
- React → TanStack Query hook → Axios → Vite `/api` proxy → Express health endpoint.
- ES modules, npm workspaces, one committed lockfile, ESLint, Prettier, tests, environment examples, and database directory placeholders.
- Public process health, security headers, allowlisted CORS, bounded JSON bodies, global rate limiting, and generic JSON errors.

No login, registration, protected dashboard, database connection, schema, migration, seed data, placement CRUD, real student data, or AI/ML functionality exists. MySQL will own relational records and sessions; MongoDB will own recruitment-process and announcement documents. There are no cross-database ACID transactions.

## Stack and versions

Use Node **24.x LTS** and npm **11.x** (verified with Node 24.19.0 / npm 11.9.0). All three package manifests include these engine requirements; `.nvmrc` selects Node 24.

Chosen majors: React 19, Vite 8, Tailwind CSS 4 (official `@tailwindcss/vite` plugin), React Router 7, TanStack Query 5, Axios 1, Express 5, Zod 4, Pino 10, Helmet 8, CORS 2, express-rate-limit 8, ESLint 10, Prettier 3, Vitest 5, and Playwright 1. Exact resolved versions are in `package-lock.json`.

Future approved database stack: MySQL 8.4 LTS recommended (minimum 8.0.16), `mysql2` promise API with parameterized SQL and no ORM; supported MongoDB with Mongoose. Database drivers, sessions, password hashing, and CSRF libraries are deferred until needed. No Docker setup or component library is added.

## Quick start

From the repository root:

```sh
nvm use # if you use nvm; otherwise install Node 24
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

The combined command runs both development servers and shuts down the other process if either exits. Defaults: frontend port **5173**, backend port **3000**. The browser requests `/api/health` through the Vite proxy, using one browser origin.

Environment files are optional for Phase 1 because safe local defaults exist. `backend/.env` is loaded by Node and `frontend/.env` by Vite. Root `.env.example` points to the workspace examples; root `.env` is not loaded. Never commit `.env`, actual credentials, or student PII. Never put secrets in `VITE_*` variables because they enter the browser bundle.

Active backend variables: `NODE_ENV` (`development`, `test`, or `production`), `PORT` (1–65535), `CLIENT_ORIGIN` (comma-separated origins, no paths or trailing slashes). Invalid active values prevent startup. Database/auth variables are documented as future placeholders and are not required or used now. `VITE_API_BASE_URL` defaults to `/api`; `API_PROXY_TARGET` defaults to the local backend on port 3000. If changing the backend port, update the proxy target too. Restart servers after environment changes.

For separate terminals:

```sh
npm run dev -w backend
npm run dev -w frontend
```

The backend also supports `npm start -w backend`. This is the Phase 1 health service only. `npm run build` produces `frontend/dist`; `npm run preview -w frontend` previews static assets but does **not** proxy `/api`. Use `npm run dev` for the integrated workflow; a future deployment must supply its own API reverse proxy and SPA fallback.

## Verification

```sh
npm run lint
npm run format:check
npm test
npm run test:integration -w backend
npm run build
npm audit
npx playwright install chromium
npm run test:e2e
```

In this cloud machine, Chromium is preinstalled; use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` when browser downloads are restricted. The optional path override does not affect application configuration.

Playwright starts and stops the combined dev servers itself; ensure ports 3000 and 5173 are free. The E2E checks use the real API at mobile (375px) and desktop (1280px) widths, verify SPA navigation, and check direct-route refresh and 404 behavior. On minimal Linux systems Chromium may also require system dependencies; follow Playwright's supported installation instructions.

Use `npm run format` to format editable files. AGENTS.md is excluded to preserve its uploaded bytes. Root `npm run check` runs lint, format checking, frontend/backend tests, and the frontend build. Tests are verification of the foundation only, not of future workflows.

With development servers running, a local smoke check is:

```sh
curl --fail http://127.0.0.1:3000/api/health
curl --fail http://127.0.0.1:5173/api/health
```

Both should return `success: true`, `status: "ok"`, and `databases: "not-configured"`. This is **liveness**, not database readiness. Database connectivity is untested.

## Structure

```text
frontend/src/     API client, hooks, components, layout, routes, preview pages
backend/src/      Configuration, app/server, route, controller, health service, errors
database/         Empty MySQL/MongoDB schemas, migrations, seed, and query directories
tests/backend/    Configuration unit tests and HTTP integration tests
tests/e2e/        Live frontend/API smoke and responsive layout checks
docs/            Phase scope, API contract, DBMS status, setup and verification notes
```

Frontend component tests live beside components. Install from the root; one workspace lockfile is authoritative. `frontend` scripts: `dev`, `build`, `preview`, `lint`, `format`, `test`. `backend` scripts: `dev`, `start`, `lint`, `format`, `test`, `test:integration`, plus reserved database/admin commands.

`db:migrate`, `db:seed`, `admin:create`, and `reconcile` deliberately **exit with status 1** and explain that their implementation is deferred. They perform no work. They are script-name reservations, not working tools. Authentication/authorization and backend CSRF protection must be implemented before any state-changing or protected API. The Axios mutation guard is only an early safety guard; it is not implemented authentication or server CSRF protection.

## Next phase

Stop after initialization and wait for approval. Phase 2 will design and implement the databases, migrations, validation, and seeds with matching documentation and real test-database checks. Password-hashing selection and other open decisions remain deferred. AGENTS.md is preserved unchanged, including its historical status table; current implementation evidence belongs in the PR and verification notes.

See [setup guide](docs/setup-guide.md), [API contract](docs/api-documentation.md), [phase decisions](docs/architecture/phase-1.md), and [DBMS status](docs/dbms-concepts.md).
