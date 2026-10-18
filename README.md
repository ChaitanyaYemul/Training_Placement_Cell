# College Training and Placement Cell Management System

Phase 3 authentication is implemented on top of the merged Phase 2 database architecture. This commit intentionally contains no business REST APIs; they are a separately tested follow-up commit. The existing frontend remains a public layout preview.

Use Node 24.x LTS and npm 11.x. Run `npm ci`, configure backend/.env securely, apply migrations with `npm run db:migrate -w backend`, then `npm run dev`. Authentication startup requires MySQL and unique SESSION_SECRET/CSRF_SECRET values (at least 32 characters); example placeholders are rejected. See [setup guide](docs/setup-guide.md) and [security configuration](docs/security.md). Never commit .env or pass credentials in command-line arguments.

Authentication uses Argon2id, express-session and persistent MySQL sessions. Students register only as students; administrators are provisioned through the operator CLI. CSRF, exact-origin checks, regeneration, expiration, role middleware, rate limiting and generic errors are implemented. No authentication UI or frontend redesign is included.

```sh
npm run check
npm run test:db:services -w backend
npm run test:db -w backend
npm run test:auth -w backend
npm audit
```

Actual database tests require disposable names ending in `_test`; they destroy those test schemas. Configure backend/.env.test securely, including test SESSION_SECRET/CSRF_SECRET values. No real credentials are committed. The optional local Docker helper preserves an existing file and never prints credentials. See [verification](docs/verification.md).

Use `npm run admin:create -w backend` with secure operator-provided ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD environment bindings. There is no admin registration API. No passwords/hashes or demo accounts are seeded. [ADR 001](docs/architecture/adr-001-password-hashing.md) records the approved hashing choice.

The stack remains React 19 / Vite 8 / Tailwind 4, React Router 7, TanStack Query 5, Axios 1, Node 24 / Express 5, mysql2 3 / MySQL 8.4, Mongoose 9 / MongoDB 8.0, Zod 4, Pino 10 and existing testing tools. Exact package versions are in package-lock.json. No AI/ML, ORM or new frontend component library is included.

MySQL owns relational master data, applications/history and sessions. MongoDB owns recruitment processes and announcements. No transaction spans the two databases. New migration 0018 adds app_sessions; historical migrations remain unchanged. [ER diagram](docs/er-diagram.md), [Mongo design](docs/mongodb-schema.md), and [DBMS concepts](docs/dbms-concepts.md) describe the foundation.

[API contract](docs/api-documentation.md) lists the implemented authentication endpoints. Business APIs and future frontend integration are explicitly separate work. AGENTS.md remains unchanged.
