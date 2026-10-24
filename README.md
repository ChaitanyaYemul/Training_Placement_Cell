# College Training and Placement Cell Management System

Phase 4 connects the React frontend to the merged authentication and business APIs. Students can register, sign in, edit their profile and academics, browse companies/drives, inspect eligibility and recruitment timelines, read announcements, and view existing application statuses. Administrators can manage companies, jobs, drives, recruitment plans and announcements, and update application statuses.

Application submission/withdrawal, application-history detail, reports, and reconciliation remain deferred. No controls imply those APIs exist. AGENTS.md and database schemas are unchanged.

## Run locally

Use **Node 24.x LTS / npm 11.x**. Install with `npm ci`. Configure ignored `backend/.env` from its example with real MySQL/MongoDB access, unique session/CSRF secrets, and exact `CLIENT_ORIGIN` values. Apply migrations and MongoDB validators using schema-owner credentials, then use a separate least-privileged application account at runtime:

```sh
npm run db:migrate -w backend
npm run mongo:setup -w backend
npm run db:seed -w backend
npm run db:check -w backend
npm run dev
```

Vite serves the SPA on port 5173 and proxies `/api` to Express on port 3000. Registration creates only students and leads to login. Administrator accounts use `npm run admin:create -w backend` with securely supplied `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD`; never pass passwords as command-line arguments. No development accounts are seeded.

See the [setup guide](docs/setup-guide.md), [frontend architecture and routes](docs/architecture/phase-4-frontend.md), [API contract](docs/api-documentation.md), and [security configuration](docs/security.md).

## Verification

```sh
npm run check
npm run test:db:services -w backend
npm run test:backend -w backend
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

The Chromium override is for machines with an installed browser; otherwise install Chromium through Playwright. Database suites and E2E **reset only explicitly configured disposable databases ending in `_test`**. Configure `backend/.env.test` securely or use the local Docker helper. Do not run those suites concurrently. E2E loads `.env.test` explicitly, provisions fictional fixtures, starts both servers and keeps security middleware enabled. It waits for capacity under the real shared rate limiter. See [verification evidence](docs/verification.md).

## Architecture

React 19 / Vite 8 / Tailwind 4, React Router 7, TanStack Query 5, Axios 1, Node 24 / Express 5, mysql2 3 / MySQL 8.4, Mongoose 9 / MongoDB 8.0, Zod 4, Pino 10. Exact versions are locked in `package-lock.json`. Phase 4 adds no dependencies, UI library, ORM, or AI/ML features.

Authentication uses Argon2id and persistent MySQL sessions with HTTP-only cookies. CSRF tokens stay in memory. Backend roles, ownership, eligibility and lifecycle rules remain authoritative. Query invalidation updates views without document reloads; visible dashboards and announcements poll every 45 seconds.

MySQL owns relational records, applications/history and sessions. MongoDB owns recruitment documents and announcements. No transaction spans both databases. The existing 18 migrations, normalized schema, views, constraints and document validators remain intact. See the [ER diagram](docs/er-diagram.md), [MongoDB design](docs/mongodb-schema.md), [DBMS concepts](docs/dbms-concepts.md), and [password hashing ADR](docs/architecture/adr-001-password-hashing.md).
