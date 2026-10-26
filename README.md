# College Training and Placement Cell Management System

A full-stack portal for one college's Training and Placement Cell, with student and administrator workspaces. It demonstrates normalized relational data, transactional application history, flexible recruitment documents, and safe coordination between MySQL and MongoDB. No AI/ML features are included.

## Features by role

| Role          | Features                                                                                                                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student       | Register/login/logout; own profile and semester academics; companies and jobs; published/completed/cancelled drives; server-evaluated eligibility; recruitment timelines and document checklists; apply, withdraw and read permanent status history; targeted announcements |
| Administrator | Companies and postings; draft/publish/complete/cancel/archive drives; eligibility and eligible branches; recruitment rounds/schedules/checklists; announcements; shortlist/select/reject applications; filtered reports and CSV exports                                     |
| Operator      | Migrations and validators; secure admin provisioning; isolated demo provisioning; read-only cross-database reconciliation with separately confirmed audited orphan repair                                                                                                   |

The one-student-one-offer restriction, academic verification, uploads, messaging and notifications are outside the implemented scope. Withdrawal is final; selected/rejected/withdrawn applications cannot be reopened.

## Stack and architecture

Node **24.x LTS**, npm **11.x**, React 19, Vite 8, Tailwind 4, React Router 7, TanStack Query 5, Axios 1, Express 5, mysql2 3, MySQL **8.4 LTS** (minimum 8.0.16), Mongoose 9, MongoDB **8.0**, Zod 4 and Pino 10. Exact versions are locked in `package-lock.json`; application source is JavaScript, without an ORM or UI component library.

React pages → query/mutation hooks → API functions → Axios. Express routes → authentication/role/validation middleware → controllers → services → repositories → databases. MySQL owns users, profiles, academics, companies, postings, drives, applications/history and sessions. MongoDB owns recruitment processes and announcements. No transaction spans both databases.

Authentication uses Argon2id, MySQL-backed HTTP-only sessions, session-bound CSRF and exact-origin checks. Roles and student ownership are enforced by the backend. Query invalidation and visible-page polling refresh the UI without a document reload. [Schema summary](docs/database-summary.md), [ER diagram](docs/er-diagram.md), [Mongo design](docs/mongodb-schema.md), [DBMS demonstrations](docs/dbms-concepts.md).

## Install and run

Install MySQL/MongoDB and create an empty MySQL database. Copy `backend/.env.example` to ignored `backend/.env`, supply actual database access and independently generated session/CSRF secrets of at least 32 characters. Use schema-owner credentials for initialization and a DML-only application account at runtime. Optional frontend settings live in `frontend/.env`.

```sh
npm ci
npm run db:migrate -w backend
npm run mongo:setup -w backend
npm run db:seed -w backend
npm run db:check -w backend
npm run dev
```

Open port 5173. Vite proxies `/api` to Express on 3000. Register a student at `/register`; provision an administrator with `npm run admin:create -w backend` using securely supplied `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`. Never pass passwords on command lines. Seeds contain fictional reference data and no accounts/password hashes.

Follow the [complete setup guide](docs/setup-guide.md) and [DEMO.md](DEMO.md) for an isolated, repeatable presentation setup with generated local credentials.

## Configuration

Required backend bindings: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MONGODB_URI`, `SESSION_SECRET`, `CSRF_SECRET`, and exact `CLIENT_ORIGIN`. Other settings: `NODE_ENV`, `PORT`, `SESSION_MAX_AGE_MS`, `TRUST_PROXY_HOPS`, `AUTH_RATE_LIMIT`. Operator account variables are only for provisioning. Optional frontend: `VITE_API_BASE_URL`, `VITE_INSTITUTION_TIMEZONE`, `API_PROXY_TARGET`. See workspace `.env.example` files and the [environment inventory](docs/setup-guide.md#environment-inventory). Never put secrets in `VITE_*` variables.

## Verify

```sh
npm run check
npm run test:db:services -w backend
npm run test:backend -w backend
npm run test:outage -w backend
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

`check` includes lint, JavaScript syntax validation, formatting, ordinary tests and production build. This JavaScript stack has no TypeScript type-check command. Configure dedicated `_test` database access through `backend/.env.test` or the local Docker helper. Database suites and E2E allocate new disposable `_test` schemas without dropping existing databases; run them sequentially. E2E starts real servers and keeps security middleware enabled. Install Playwright Chromium if the executable override is unavailable. [Executed verification and counts](docs/verification.md).

## Reports, operations and deployment

[API documentation](docs/api-documentation.md), [report definitions](docs/architecture/reporting.md), [reconciliation](docs/architecture/reconciliation.md), [security](docs/security.md), and [deployment steps/checklist](docs/deployment.md). Build with `npm run build`, serve `frontend/dist` with an SPA fallback and proxy `/api` to a single Express process behind HTTPS. Keep databases private and apply migrations/validators before starting the release. Deployment preparation does not deploy or modify production data.
