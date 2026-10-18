# AGENTS.md — College Training and Placement Cell Management System

> **Audience:** AI coding agents (Claude Code, Codex, Cursor, and similar assistants) and human contributors.
> **Authority:** This file is the single source of project conventions. If a task conflicts with it, stop and ask (see §19).
> **Repository state:** The directory tree in §3 is the *target* structure, not evidence that any file exists. Before editing, inspect the repository (`git status`, directory listing, `package.json` files, existing code). Never assume a file, table, collection, endpoint, script, or test exists, and never describe planned work as implemented.
> **Keywords:** MUST / MUST NOT are mandatory. SHOULD is the default unless there is a stated reason. MAY is optional.

---

## 0. Non-Negotiables (Read First)

1. **No AI in the product.** No AI, ML, chatbot, LLM, recommendation, or predictive-analytics features. No AI SDKs (`openai`, `@anthropic-ai/sdk`, `langchain`, `tensorflow`, etc.) as dependencies. Deterministic rule-based eligibility checks are allowed and required.
2. **MySQL is the source of truth** for structured, relational, transactional data. **MongoDB owns only** flexible recruitment-process and announcement documents (§5–§7).
3. **No ACID transaction spans MySQL and MongoDB.** Design every cross-database workflow for safe partial failure (§7).
4. **Authorization is enforced on the backend** for every protected endpoint. Hiding UI elements is not security.
5. **All SQL is parameterized.** No string-concatenated SQL. No `SELECT *` in application code.
6. **Layering is strict:** React components → hooks → API functions; Express routes → controllers → services → repositories. Business logic never lives in React components or route handlers; database access never lives outside repositories.
7. **The UI updates without full page reloads** (TanStack Query + Axios + React Router). `window.location.reload()` and `window.location.href = ...` for in-app navigation are forbidden (§12).
8. **Application history is never silently destroyed.** Applications and status history are never hard-deleted (§8).
9. **Schema changes require migrations;** document changes require doc updates (§17).
10. **Never claim something works unless you ran it.** Report exactly which commands you ran and their results (§19).
11. **Secrets and student PII never enter Git, logs, or error responses.**
12. **Ask before** changing the approved stack, database ownership, or project scope.

---

## 1. Project Overview

### 1.1 Purpose and Scope
A professional, responsive, secure, and maintainable portal for a college Training and Placement (T&P) Cell. It centralizes company information, placement drives, eligibility rules, recruitment schedules, student applications, selection results, and official announcements.

**The primary goal is demonstrating DBMS concepts (relational and document-oriented) through a working full-stack application.** Feature breadth is secondary to correct, well-documented database design and implementation.

### 1.2 Users

| Role | Responsibilities |
|---|---|
| **Student** | Registers, maintains profile and academic details, browses companies and drives, checks eligibility, views recruitment rounds/schedules/document checklists, applies, tracks application status, reads announcements. |
| **Administrator (T&P Cell)** | Manages companies, job postings, drives, eligibility, recruitment rounds and schedules, document checklists, announcements; reviews applications; updates selection statuses; views reports; archives completed drives. |

### 1.3 Core Functional Requirements
Authentication (register/login/logout/session); student profile and academic records; company and job-posting management; placement-drive lifecycle (draft → published → completed/cancelled → archived); eligibility definition and backend validation; recruitment-round configuration (MongoDB); application submission and status tracking with history; announcements; basic admin reports.

### 1.4 Academic DBMS Objectives
Relational modeling and normalization (to 3NF), keys and referential integrity, constraints, joins, subqueries, views, indexes, transactions and ACID, aggregation; document modeling, embedding vs. referencing, schema validation, MongoDB CRUD and aggregation; and the trade-offs of using both database types together. Each implemented concept MUST be documented in `docs/dbms-concepts.md` (§13).

### 1.5 System Boundaries
In scope: one college, one T&P Cell, two roles, web UI, REST API, two databases.

### 1.6 Non-Goals and Prohibited Features
- **Prohibited:** AI/ML/chatbots/LLM integrations/recommendation engines/predictive analytics.
- **Out of scope unless explicitly approved:** resume/file uploads and file storage, email/SMS/push notifications, payment processing, multi-college tenancy, alumni features, mobile apps, offer-letter generation, per-round result tracking, video interview integration, third-party OAuth.
- Document checklists (`requiredDocuments`) are **informational lists**; students do not upload documents in this system.

### 1.7 Quality Standards
Readable and modular code; small focused files; consistent naming; validated inputs; explicit error handling; documented schemas; tests for business rules; a design a student developer can explain line-by-line in a viva. Prefer simple and correct over clever and elaborate.

---

## 2. Technology Stack

### 2.1 Approved Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React (current stable) + Vite, JavaScript (ES modules), Hooks | SPA UI |
| Styling | Tailwind CSS (use the current major's official Vite setup) | Responsive styling |
| Routing | React Router (current major, `createBrowserRouter` or equivalent) | Client-side navigation |
| HTTP | Axios | Single configured instance with credentials + CSRF handling |
| Server state | TanStack Query **v5 API** (`isPending`, `gcTime`, object-form `useQuery`) | Caching, refetching, invalidation |
| Backend | Node.js (active or maintenance LTS), Express (current stable major), ES modules | REST API |
| Relational DB | MySQL 8.0.16+ (8.4 LTS or newer recommended; `CHECK` constraints are enforced only from 8.0.16), InnoDB, `utf8mb4` | Source of truth |
| MySQL client | `mysql2` (promise API, connection pool). **No ORM** (no Sequelize/Prisma/TypeORM) — raw parameterized SQL keeps DBMS concepts visible | Data access |
| Document DB | MongoDB (current supported release) with **Mongoose** | Flexible recruitment/announcement documents |
| Auth | `express-session` + persistent store, HTTP-only cookie | Session-based auth |
| Password hashing | `bcrypt` (cost ≥ 12) **or** Argon2id (`argon2`) — pick one, record it in an ADR, never mix | Credential protection |
| Validation | `zod` on the backend (single validation library) | Request validation |
| Security middleware | `helmet`, `cors` (allowlist), `express-rate-limit`, CSRF protection (§10) | Hardening |
| Logging | One structured logger (e.g., `pino`) with redaction | Observability |
| Tooling | Git, npm, ESLint, Prettier | Quality |
| Testing | Vitest (or Jest) + Supertest (API), React Testing Library + MSW (components), Playwright (E2E) | Verification |

### 2.2 Conditional / Optional
- **Socket.IO** — only when polling is demonstrably insufficient (§12.4). Needs approval.
- **`react-hook-form`** — optional for large forms; plain controlled inputs are acceptable.
- **Docker Compose** for local MySQL/MongoDB — optional; propose before adding.

### 2.3 Dependency Rules
- Use maintained, compatible packages. Before adding a dependency check: is it needed, is it actively maintained, is the license acceptable, does it duplicate something already installed.
- Do not pin versions copied from this document; choose current stable versions at initialization, then record the chosen majors in `README.md`.
- Commit `package-lock.json`. Run `npm audit` after dependency changes and report the result.
- Do not use deprecated packages (e.g., `csurf`). Do not add UI component libraries without approval — build the small shared component set in §11.
- Node and npm versions go in each `package.json` `engines` field and in `README.md`.

### 2.4 Target npm Scripts (to be created in Phase 1 — verify before using)
- `frontend`: `dev`, `build`, `preview`, `lint`, `format`, `test`
- `backend`: `dev` (`node --watch`), `start`, `lint`, `format`, `test`, `test:integration`, `db:migrate`, `db:seed`, `admin:create`, `reconcile`

---

## 3. System Architecture

### 3.1 Target Structure

```text
training-placement-system/
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios instance + per-resource request functions
│   │   ├── assets/
│   │   ├── components/     # Reusable, presentational, domain-agnostic UI
│   │   ├── context/        # AuthContext, ToastContext (small, global-only)
│   │   ├── hooks/          # TanStack Query hooks (useCompanies, useApplyToDrive, ...)
│   │   ├── layouts/        # PublicLayout, StudentLayout, AdminLayout
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── student/
│   │   │   └── admin/
│   │   ├── routes/         # Route table, ProtectedRoute, RoleRoute
│   │   ├── services/       # Pure client-side domain helpers (no React, no HTTP)
│   │   ├── utils/          # Generic helpers (dates, formatting, classnames)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/         # env parsing/validation, mysql pool, mongoose connection, session, cors
│   │   ├── controllers/    # HTTP in/out only
│   │   ├── middleware/     # auth, role, validate, rate-limit, csrf, error handler
│   │   ├── models/
│   │   │   ├── mysql/      # table/column constants, status enums, row→DTO mappers (no ORM)
│   │   │   └── mongodb/    # Mongoose schemas and models
│   │   ├── repositories/   # ALL database access (SQL and Mongo)
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Business rules, transactions, cross-DB orchestration
│   │   ├── validators/     # Zod schemas per resource
│   │   ├── utils/          # AppError, pagination helpers, date helpers
│   │   ├── app.js          # Express app assembly (no listen)
│   │   └── server.js       # Startup: connect DBs, listen
│   ├── scripts/            # CLI: migrate, seed, create-admin, reconcile
│   └── package.json
├── database/
│   ├── mysql/
│   │   ├── schema.sql      # Full current schema (reference; regenerated from migrations)
│   │   ├── seed.sql        # Reference + sample data (no real student data, no password hashes)
│   │   ├── migrations/     # Ordered, immutable SQL files
│   │   └── queries/        # Documented demo queries (joins, subqueries, aggregates)
│   └── mongodb/
│       ├── schemas/        # $jsonSchema validators + index definitions
│       ├── seed/
│       └── queries/        # Documented find/aggregate demos
├── docs/
│   ├── architecture/       # ADRs, assumptions register
│   ├── dbms-concepts.md
│   ├── er-diagram.md       # Mermaid ER diagram
│   ├── mongodb-schema.md
│   ├── api-documentation.md
│   └── setup-guide.md
└── tests/
    ├── backend/{unit,integration}/
    ├── db/                 # MySQL constraint/transaction tests, MongoDB validation tests
    └── e2e/
```

This is a **proposed** structure. `backend/scripts/` and the `tests/` subfolders are additions to the baseline; frontend component tests are co-located as `*.test.jsx` beside their component. Do not create directories or files until a task needs them.

### 3.2 Layer Responsibilities (Enforced)

**Backend request flow:** `route → middleware (auth, role, validate) → controller → service → repository → database`

| Layer | MUST | MUST NOT |
|---|---|---|
| Route | Map method+path to middleware chain and controller | Contain logic or DB calls |
| Validator | Define Zod schemas (body, params, query); reject unknown keys | Touch the DB |
| Controller | Read validated input, call one service method, shape the HTTP response | Contain business rules or DB access |
| Service | Enforce business rules, orchestrate repositories, open MySQL transactions, coordinate MySQL+Mongo, throw `AppError` | Read `req`/`res`, write SQL |
| Repository | Contain all SQL (`mysql2`) and Mongoose/driver calls; accept an optional transaction connection; return plain objects | Enforce business rules, read `req`/`res` |
| `models/mysql` | Hold constants (table names, column lists, enums) and row mappers | Execute queries |
| `models/mongodb` | Define Mongoose schemas/models | Contain business rules |

**Frontend flow:** `page → hook (TanStack Query) → api function → Axios`. Pages compose components and hooks; hooks own query keys, invalidation, and cache policy; `api/` functions only perform HTTP and unwrap the response envelope; `services/` holds pure helpers (status label maps, deadline formatting, DTO→view-model mapping).

### 3.3 Configuration
- Environment variables are parsed and validated once at startup in `backend/src/config/env.js`; the server refuses to start on missing/invalid values. No `process.env` access outside `config/`.
- `.env.example` lists every variable with a placeholder (never a real value): `NODE_ENV`, `PORT`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MONGODB_URI`, `SESSION_SECRET`, `CSRF_SECRET`, `SESSION_MAX_AGE_MS`, `CLIENT_ORIGIN`, and (frontend) `VITE_API_BASE_URL`.
- In development, use the Vite dev-server proxy for `/api` so the browser sees one origin (simplifies cookies and CORS).

---

## 4. User Roles and Permissions

### 4.1 Permission Matrix (backend-enforced)

| Capability | Anonymous | Student | Admin |
|---|:--:|:--:|:--:|
| Register (student role only), log in | ✔ | — | — |
| Log out, `GET /auth/me` | — | ✔ | ✔ |
| Read/update **own** profile and academic records | — | ✔ (own) | — |
| List/view companies | — | ✔ (active only) | ✔ (all) |
| Create/update/delete companies | — | ✖ | ✔ |
| View job postings | — | ✔ (for student-visible drives) | ✔ |
| Create/update/delete job postings | — | ✖ | ✔ |
| View drives | — | ✔ (published, completed, cancelled; never draft/archived) | ✔ (all) |
| Create/update/status-change/delete drives | — | ✖ | ✔ |
| View recruitment rounds and checklist | — | ✔ (visible drives) | ✔ |
| Edit rounds, schedules, checklist | — | ✖ | ✔ |
| Apply to a drive | — | ✔ (self, if eligible) | ✖ |
| Withdraw own application | — | ✔ (own) | ✖ |
| View applications | — | ✔ (own only) | ✔ (all) |
| Change application status (except withdraw) | — | ✖ | ✔ |
| Read announcements | — | ✔ (published, targeted) | ✔ (all) |
| Create/update/delete announcements | — | ✖ | ✔ |
| View reports | — | ✖ | ✔ |

### 4.2 Enforcement Rules
- Middleware chain order on protected routes: `requireAuth → requireRole(...) → validate → controller`.
- **Ownership checks live in services/repositories** (e.g., `WHERE student_id = ?` using the session's student id), never trusting a client-supplied `studentId`.
- Role is read from the server-side session/DB, never from the request body or client-editable data.
- Return `401` when unauthenticated, `403` when authenticated but not permitted, `404` when a student requests a hidden resource (avoid revealing draft drives).
- Students MUST NOT modify company records, official drive details, or any other student's data.

---

## 5. MySQL Database Guidelines

### 5.1 Principles
- InnoDB, `utf8mb4`, explicit `NOT NULL` wherever a value is required.
- Store all timestamps as `DATETIME` in **UTC** (pool option `timezone: 'Z'`); compare deadlines using the database clock (`UTC_TIMESTAMP()`), not the client's. Display in the institution's timezone (default `Asia/Kolkata`, configurable) in the frontend only.
- Primary keys: `INT UNSIGNED AUTO_INCREMENT` named `id` (fits safely in JavaScript numbers and in Mongo `Number` fields).
- Normalize to **3NF**; denormalize only with a written justification in `docs/architecture/`.
- Use `ENUM` or `CHECK`-constrained columns for fixed vocabularies; keep the allowed values in one place (`models/mysql/`) and mirror them in the schema.

### 5.2 Baseline Schema Outline (refine in Phase 2; this is a design, not an existing schema)

| Table | Key columns and constraints |
|---|---|
| `users` | `id`, `email` UNIQUE, `password_hash`, `role` ENUM('student','admin'), `is_active`, `last_login_at`, timestamps |
| `branches` *(recommended addition)* | `id`, `code` UNIQUE, `name` UNIQUE — avoids free-text branch values (normalization, joins) |
| `students` | `id`, `user_id` UNIQUE FK→users (RESTRICT), `enrollment_number` UNIQUE, `full_name`, `phone`, `branch_id` FK→branches, `graduation_year`, timestamps |
| `admins` | `id`, `user_id` UNIQUE FK→users (RESTRICT), `full_name`, `designation` |
| `academic_records` | `id`, `student_id` FK→students (CASCADE), `semester` (1–12), `sgpa`, `cgpa`, `active_backlogs`; UNIQUE(`student_id`,`semester`); `CHECK` sgpa/cgpa between 0 and 10 |
| `companies` | `id`, `name` UNIQUE, `industry`, `website`, `description`, `headquarters`, `contact_email`, `is_active`, timestamps |
| `job_postings` | `id`, `company_id` FK→companies (RESTRICT), `title`, `description`, `job_type` ENUM('full_time','internship','internship_ppo'), `ctc_lpa` (nullable, `CHECK` ≥ 0), `location`, `is_active`, timestamps |
| `placement_drives` | `id`, `job_posting_id` FK→job_postings (RESTRICT), `title`, `description`, `status` ENUM('draft','published','completed','cancelled','archived'), `registration_deadline` NOT NULL, `drive_date` NULL, `min_cgpa`, `max_active_backlogs`, `eligible_graduation_year`, `created_by` FK→users, timestamps; `CHECK` min_cgpa 0–10 |
| `drive_eligible_branches` | PK(`drive_id`,`branch_id`); `drive_id` FK→placement_drives (CASCADE); `branch_id` FK→branches (RESTRICT) |
| `student_applications` | `id`, `drive_id` FK (RESTRICT), `student_id` FK (RESTRICT), `status` ENUM('applied','shortlisted','selected','rejected','withdrawn') DEFAULT 'applied', `applied_at`, `updated_at`; **UNIQUE(`drive_id`,`student_id`)** |
| `application_status_history` | `id`, `application_id` FK (RESTRICT), `from_status` NULL, `to_status`, `changed_by` FK→users (RESTRICT), `remarks` NULL, `changed_at` |

**Design notes**
- `placement_drives` deliberately has **no `company_id`**: the company is reachable through `job_postings.company_id`. Storing both would create a transitive dependency (drive → posting → company) and violate 3NF. Use the view `v_drive_overview` to expose company data with drives.
- A drive references exactly one job posting (assumption A-02). A company hiring for several roles has several postings and drives.
- CGPA and backlogs used for eligibility come from the student's **latest** `academic_records` row via the view `v_student_academic_summary` (assumption A-03). Do not duplicate CGPA onto `students`.
- Delete behavior: **RESTRICT by default**; CASCADE only for pure child rows that have no independent meaning (`drive_eligible_branches`, `academic_records`). Users, students, companies, postings, drives, applications, and history are deactivated/archived, not deleted, once referenced.

### 5.3 Required Practices
- Primary keys, foreign keys, UNIQUE, `NOT NULL`, and `CHECK` constraints on every table where they apply. The database MUST reject invalid data even if the API validation is bypassed.
- **Parameterized queries only** (`?` placeholders via `mysql2` `execute`/`query` with value arrays). Dynamic `ORDER BY` columns and directions MUST come from an allowlist, never from raw input.
- **Transactions** (`withTransaction(conn => ...)` helper) for any multi-statement write: student registration (`users` + `students`), apply-to-drive, status change (`student_applications` + `application_status_history`), drive create (`placement_drives` + `drive_eligible_branches`). Use `SELECT ... FOR UPDATE` when a decision depends on a row that may change concurrently (e.g., application status transitions). Always roll back on error and release the connection in `finally`.
- **Duplicate prevention** via UNIQUE constraints; translate `ER_DUP_ENTRY` to HTTP 409. Do not rely on a "check then insert" race.
- **Indexes** (verify with `EXPLAIN`, document results in `docs/dbms-concepts.md`): `(status, registration_deadline)` on drives; `(student_id, status)` and `(drive_id, status)` on applications; `(company_id)` on job postings; `(branch_id, graduation_year)` on students; `(application_id, changed_at)` on history. Do not add indexes without a query that uses them.
- **Pagination and filtering** on all list queries (§9.5), with `LIMIT/OFFSET` and a matching `COUNT(*)`.
- **Views** (at least): `v_drive_overview`, `v_student_academic_summary`, `v_application_details`, `v_placement_stats_by_branch`.
- **Joins, subqueries, aggregates** with real use cases: e.g., drives with company and eligible branches (joins), students eligible for a drive (subquery/`EXISTS`), selected-per-company and branch-wise placement counts (`GROUP BY`/`HAVING`). Keep these in `database/mysql/queries/` with comments.
- **Stored procedures/triggers are optional** and justified individually. Business logic MUST live in exactly one place — never duplicate a rule in both a trigger and a service. Reasonable candidates: a trigger that blocks `DELETE` on `student_applications` and `application_status_history` (protects history), and one reporting procedure/view. Status-transition rules live in the service layer (§8).

### 5.4 Migrations
- Every schema change is a new numbered, immutable file in `database/mysql/migrations/` (e.g., `0007_add_drive_venue.sql`). **Never edit a migration that has been applied or committed.**
- Track applied migrations in a `schema_migrations` table via `backend/scripts/migrate.js`.
- Update `schema.sql`, `docs/er-diagram.md`, and `docs/dbms-concepts.md` in the same change.
- Seeds MUST NOT contain real student data or password hashes. Demo accounts are created by a dev-only script that refuses to run when `NODE_ENV=production`.

### 5.5 SQL Injection and Integrity Rules
- Never interpolate user input into SQL text; never build `IN (...)` lists by string concatenation (generate placeholders).
- Never enable `multipleStatements` on the pool.
- Application statuses are changed only through the status service (single transition table). Direct `UPDATE student_applications SET status = ...` outside the repository method called by that service is forbidden.
- Use the least-privileged MySQL user for the application (no `DROP`, `GRANT`, or `FILE`); migrations may use a separate privileged user.

---

## 6. MongoDB Database Guidelines

### 6.1 Role
MongoDB stores **flexible, document-shaped** data whose structure varies per drive or announcement. It never stores relational master records (students, companies, drives, postings) and never duplicates them beyond a reference id.

### 6.2 Collections

#### `recruitment_processes` (required)
One document per placement drive, keyed by `placementDriveId` (the MySQL `placement_drives.id`).

```json
{
  "placementDriveId": 101,
  "rounds": [
    { "roundNumber": 1, "roundName": "Resume Shortlisting", "roundType": "screening",
      "description": "Initial resume screening", "mode": "online", "scheduledAt": null },
    { "roundNumber": 2, "roundName": "Online Assessment", "roundType": "assessment",
      "description": "Aptitude and coding assessment", "mode": "online",
      "scheduledAt": "2026-11-15T09:30:00.000Z", "details": { "durationMinutes": 90 } },
    { "roundNumber": 3, "roundName": "Technical Interview", "roundType": "interview",
      "description": "Technical evaluation", "mode": "offline", "scheduledAt": null,
      "details": { "venue": "Seminar Hall 2" } }
  ],
  "requiredDocuments": ["Resume", "College ID Card", "Academic Transcripts"],
  "additionalRequirements": {},
  "schemaVersion": 1,
  "updatedBy": 3,
  "createdAt": "2026-10-01T08:00:00.000Z",
  "updatedAt": "2026-10-02T10:15:00.000Z"
}
```

Field rules:
- `placementDriveId`: integer, required, **unique index** (one process per drive).
- `rounds[].roundNumber`: integer ≥ 1; numbers MUST be **unique and contiguous (1..n)**, array stored in ascending order.
- `rounds[].roundType`: enum `screening | assessment | group_discussion | interview | hr | other`.
- `rounds[].mode`: enum `online | offline | hybrid`.
- `rounds[].scheduledAt`: ISO-8601 UTC `Date` **or `null`**. When two consecutive rounds both have a schedule, round *n+1* MUST NOT start before round *n* (assumption A-06).
- `rounds[].details`: optional object for type-specific attributes (e.g., `durationMinutes`, `platform`, `venue`, `panelSize`). This is the deliberate "flexible schema" demonstration; keys must not start with `$` or contain `.`, and total document size/nesting is capped by validation.
- `requiredDocuments`: array of unique, trimmed, non-empty strings (bounded length and count).
- `additionalRequirements`: free-form object, default `{}`, validated for depth/size and forbidden keys.
- Optional/missing fields MUST be handled explicitly: repositories/mappers return documented defaults (`[]`, `{}`, `null`) rather than `undefined`.

#### `placement_announcements` (default home for announcements — assumption A-04)
```json
{
  "title": "Pre-placement talk: Acme Corp",
  "body": "Attendance is mandatory for registered students.",
  "status": "published",
  "priority": "important",
  "audience": { "type": "branches", "branchIds": [1, 2] },
  "relatedDriveId": 101,
  "links": [{ "label": "Instructions", "url": "https://example.edu/instructions" }],
  "isPinned": false,
  "publishedAt": "2026-10-05T06:00:00.000Z",
  "expiresAt": null,
  "createdBy": 3
}
```
`status` ∈ `draft | published`; `priority` ∈ `normal | important | urgent`; `audience.type` ∈ `all | branches`. Students see an announcement only if `status = 'published'`, `publishedAt <= now`, not expired, and the audience matches their branch (filter + projection query).

### 6.3 Required Practices
- **Two layers of validation:** Mongoose schemas (application level, includes the contiguous-round custom validator) and `$jsonSchema` collection validators stored in `database/mongodb/schemas/` (database level). Keep them consistent; changing one means updating the other.
- **Indexes** (declared in code and mirrored in `database/mongodb/schemas/`): unique `{ placementDriveId: 1 }`; multikey `{ "rounds.scheduledAt": 1 }`; announcements `{ status: 1, publishedAt: -1 }` and `{ relatedDriveId: 1 }`. In production-like runs, disable `autoIndex` and create indexes via a script.
- **CRUD with projections:** list endpoints project only the needed fields (`{ rounds: 0 }` for summary lists, `{ requiredDocuments: 1 }` for checklists).
- **Aggregation pipelines with real use cases:**
  - Upcoming schedule for a student: `$match placementDriveId $in [...]` → `$unwind rounds` → `$match rounds.scheduledAt >= now` → `$sort` → `$project`.
  - Round-type distribution across drives: `$unwind rounds` → `$group by rounds.roundType`.
  - Most commonly required documents: `$unwind requiredDocuments` → `$group` → `$sort`.
- **Concurrency:** enable Mongoose `optimisticConcurrency: true` on `recruitment_processes`; map `VersionError` to HTTP 409 so two admins cannot silently overwrite each other.
- **Sanitization:** never pass `req.body`/`req.query` objects directly into filters. Zod schemas enforce primitive types (so `{ "$gt": "" }` is rejected), and queries are built from validated fields only.
- **Atomicity:** a single-document write is atomic in MongoDB. This is the justification for embedding rounds and documents in one document. The system MUST NOT depend on multi-document Mongo transactions.

### 6.4 Embedding vs. Referencing (document this in `docs/mongodb-schema.md`)
- **Embed** data that is read and written together, owned by one parent, bounded in size, and has no independent identity (rounds, required documents, round details).
- **Reference** data with its own lifecycle or that is shared (the drive → `placementDriveId`; announcement → `relatedDriveId`; author → `createdBy`).
- Do not copy company names, drive titles, or student data into Mongo documents; resolve them from MySQL at read time in the service layer.

---

## 7. MySQL and MongoDB Integration Rules

### 7.1 Data Ownership

| Data | Owner | Notes |
|---|---|---|
| Users, students, admins, academic records, branches | MySQL | |
| Companies, job postings | MySQL | |
| Placement drive core (id, posting, status, deadline, eligibility, eligible branches) | MySQL | Master record |
| Applications and status history | MySQL | Transactional; never in Mongo |
| Recruitment rounds, schedules, required-document checklist, additional requirements | MongoDB | Keyed by `placementDriveId` |
| Announcements | MongoDB | Optional `relatedDriveId` reference |
| Sessions | MySQL (session store table) | Do not use `MemoryStore` outside tests |

Adding a new field requires first deciding its owner. If unclear, ask (§17).

### 7.2 Identifier Rules
- All cross-database ids are **integers** (MySQL `INT UNSIGNED` ↔ Mongo `Number`). Never store them as strings. APIs return ids as numbers.
- `placementDriveId` MUST reference an existing `placement_drives.id`. The service verifies existence in MySQL before any Mongo write.

### 7.3 Service-Layer Aggregation
Only services combine data from both databases. Repositories never call each other across databases. A complete drive response is `MySQL drive (+ company, posting, eligible branches) + Mongo recruitment process`:

```json
{
  "success": true,
  "data": {
    "id": 101, "title": "...", "status": "published",
    "company": { "id": 7, "name": "..." },
    "registrationDeadline": "2026-11-10T18:29:00.000Z",
    "eligibility": { "minCgpa": 7.0, "maxActiveBacklogs": 0, "graduationYear": 2027, "branches": [{ "id": 1, "code": "CSE" }] },
    "recruitment": { "rounds": [], "requiredDocuments": [], "additionalRequirements": {} }
  },
  "warnings": []
}
```

- **List endpoints MUST NOT call MongoDB once per row (N+1).** Return MySQL data only, or batch with a single `$in` query when round summaries are needed.
- If MongoDB is unavailable on a read, return the MySQL portion with `"recruitment": null` and `warnings: [{ "code": "RECRUITMENT_DATA_UNAVAILABLE" }]`. If MySQL is unavailable, return `503`; never serve Mongo-only drive data.
- If a published drive has no recruitment document, return `recruitment: null` plus warning `RECRUITMENT_DATA_MISSING` and log the drive id (reconciliation target).

### 7.4 Workflow Design (order operations so a failure leaves a harmless state)

| Workflow | Order of operations | Failure outcome / recovery |
|---|---|---|
| **Create drive** | MySQL transaction only (`placement_drives` + `drive_eligible_branches`), status `draft`. No Mongo write. | Nothing cross-database to fail. |
| **Save rounds/checklist** (`PUT /placement-drives/:id/rounds`) | 1) MySQL: drive exists and status is `draft` or `published`. 2) Mongo: idempotent upsert on `placementDriveId` (full replace of `rounds`, `requiredDocuments`, `additionalRequirements`). | Mongo failure → 503, nothing changed; client retries. `PUT` is idempotent. The wizard creates the drive then calls `PUT`; if the second call fails the drive stays a valid draft. |
| **Publish drive** | 1) Mongo: process exists with ≥ 1 round. 2) MySQL: `UPDATE ... SET status='published' WHERE id=? AND status='draft'` plus other publish preconditions (§8). | Failure before step 2 leaves a draft. Rounds on a published drive MUST keep ≥ 1 round, closing the race. |
| **Cancel / complete / archive** | MySQL status update only. Rounds service rejects edits when the drive is not `draft`/`published`. | No Mongo write needed. |
| **Hard-delete a draft** (no applications) | 1) MySQL delete (transaction). 2) Mongo delete by `placementDriveId`. | Failure after step 1 leaves an orphan Mongo document — harmless, never user-visible, removed by reconciliation. |
| **Apply / change status** | MySQL transaction only. | No cross-database dependency. |
| **Announcements** | MongoDB only; optional `relatedDriveId` validated against MySQL before write. | Reference to a later-archived drive is allowed; show a neutral label. |

Rules: never write Mongo first and MySQL second for operations whose failure would leave a *visible* broken record. Prefer "MySQL commits, Mongo write is retryable and idempotent."

### 7.5 Reconciliation
`npm run reconcile` (in `backend/scripts/`) is **read-only by default** and reports: (a) Mongo `recruitment_processes` with no matching MySQL drive (orphans); (b) published drives with a missing or empty recruitment document. `--fix` may delete only category (a), after an interactive confirmation. Document the eventual-consistency trade-offs and this script in `docs/architecture/` and `docs/dbms-concepts.md`.

> **Reminder:** MySQL and MongoDB do not share a transaction. Do not write code or comments implying atomicity across them.

---

## 8. Business Rules

Each rule has an id so tests, docs, and commits can reference it. Ambiguities are recorded as assumptions (§20), not silently resolved.

### 8.1 Rules

| ID | Rule |
|---|---|
| BR-01 | Students see only drives that have been published: statuses `published`, `completed`, `cancelled`. `draft` and `archived` drives are never listed to students. |
| BR-02 | Draft drives are accessible only to administrators. A student requesting one gets `404`. |
| BR-03 | Applications are accepted only while the drive is `published` **and** `UTC_TIMESTAMP() < registration_deadline`. The check uses the database clock. |
| BR-04 | One application per student per drive, enforced by `UNIQUE(drive_id, student_id)`. Duplicate → `409`. A withdrawn application is final; re-application is not allowed (A-07). |
| BR-05 | Eligibility is validated on the backend at apply time (§8.2). The UI may display eligibility, but the server decides. |
| BR-06 | `roundNumber` values within a drive are unique and contiguous (1..n), and rounds are stored in order. |
| BR-07 | Each drive may have a different set of rounds, round types, and document checklist. |
| BR-08 | `completed` and `cancelled` drives are visibly labeled in the UI and API (`status`), cannot receive new applications, and cannot have rounds edited. |
| BR-09 | Application status changes follow the transition table (§8.3); invalid transitions → `409`. Every change writes a history row in the same transaction. |
| BR-10 | Students can read only their own applications and profile. |
| BR-11 | Every administrator has the same permissions (no sub-roles, A-08). |
| BR-12 | Deleting must not destroy application history (§8.4). |
| BR-13 | Once a drive has ≥ 1 application, eligibility criteria (`min_cgpa`, `max_active_backlogs`, `eligible_graduation_year`, eligible branches) are locked (A-09). |
| BR-14 | After publish, `registration_deadline` may be **extended** but not shortened (A-09). |
| BR-15 | A student must have a complete profile (name, enrollment number, branch, graduation year, and at least one academic record) before applying (A-10). |
| BR-16 | A student may withdraw their own application while its status is `applied` or `shortlisted`. |
| BR-17 | The `admin` role can never be obtained through public registration or any student-facing endpoint. |
| BR-18 | A drive can be published only if: the job posting is active, the deadline is in the future, ≥ 1 eligible branch exists, all eligibility fields are set, and a recruitment process with ≥ 1 round exists. |

### 8.2 Eligibility Evaluation (deterministic, backend)
A student is eligible for a drive when **all** hold: latest `cgpa` ≥ `min_cgpa`; latest `active_backlogs` ≤ `max_active_backlogs`; `students.graduation_year` = `eligible_graduation_year`; and the student's `branch_id` appears in `drive_eligible_branches`. Implement once in the eligibility service (SQL or service logic, not both). The response for ineligible students lists the failed criteria (e.g., `["MIN_CGPA", "BRANCH"]`) so the UI can explain why. For student-facing drive lists/details, the API includes `myEligibility` and `hasApplied` computed server-side. Eligibility is evaluated at apply time and not re-evaluated afterward (A-11).

### 8.3 Status Models

**Drive status**

| From | To (admin only) |
|---|---|
| `draft` | `published` (BR-18) |
| `published` | `completed`, `cancelled` |
| `completed` | `archived` |
| `cancelled` | `archived` |
| `archived` | — (terminal) |

**Application status**

| From | To | Actor |
|---|---|---|
| (none) | `applied` | Student (apply) |
| `applied` | `shortlisted`, `rejected` | Admin |
| `shortlisted` | `selected`, `rejected` | Admin |
| `applied`, `shortlisted` | `withdrawn` | Student (own) |
| `selected`, `rejected`, `withdrawn` | — | terminal |

The transition table lives in **one** place (`services/applicationStatusService.js` plus its constants). The database additionally constrains the *set of valid values* via `ENUM`/`CHECK`.

### 8.4 Deletion Policy
- `DELETE /placement-drives/:id` hard-deletes **only `draft`** drives (which cannot have applications). Any other status → `409` with guidance to cancel/archive.
- `DELETE /companies/:id` and job postings: allowed only when nothing references them; otherwise `409` and the client should use `PATCH { isActive: false }`.
- Users, students, applications, and status history are never deleted through the API.
- Announcements may be deleted (they are not transactional history); prefer `status: draft`/`expiresAt` for retiring them.

---

## 9. Backend and REST API Standards

### 9.1 Endpoint Catalogue
Base path `/api`. The list below is the intended surface; extensions beyond the original suggestion are marked ⊕ and must be documented in `docs/api-documentation.md` when built.

```text
Auth
POST   /api/auth/register            # students only; role is fixed server-side
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/csrf-token          ⊕ issues the CSRF token for the SPA

Students
GET    /api/students/me
PATCH  /api/students/me
GET    /api/students/me/academic-records     ⊕
PUT    /api/students/me/academic-records     ⊕ replace the student's records (transaction)
GET    /api/branches                          ⊕ lookup list

Companies
GET    /api/companies
GET    /api/companies/:id
POST   /api/companies
PATCH  /api/companies/:id
DELETE /api/companies/:id
GET    /api/companies/:id/job-postings        ⊕
POST   /api/companies/:id/job-postings        ⊕
GET    /api/job-postings/:id                  ⊕
PATCH  /api/job-postings/:id                  ⊕
DELETE /api/job-postings/:id                  ⊕

Placement drives
GET    /api/placement-drives
GET    /api/placement-drives/:id
POST   /api/placement-drives
PATCH  /api/placement-drives/:id
PATCH  /api/placement-drives/:id/status       ⊕ publish / complete / cancel / archive
DELETE /api/placement-drives/:id              # draft only
GET    /api/placement-drives/:id/rounds
PUT    /api/placement-drives/:id/rounds

Applications
POST   /api/placement-drives/:id/applications
GET    /api/applications/me
PATCH  /api/applications/:id/withdraw         ⊕ student, own application
GET    /api/admin/applications
PATCH  /api/admin/applications/:id/status

Announcements
GET    /api/announcements
POST   /api/announcements
PATCH  /api/announcements/:id
DELETE /api/announcements/:id

Reports
GET    /api/admin/reports/overview
```

`GET /api/placement-drives` and `GET /api/announcements` return role-appropriate data from the same path (students are filtered per BR-01; admins see all and may filter by status).

### 9.2 Response Envelope
Success:
```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }, "warnings": [] }
```
Error:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [{ "field": "registrationDeadline", "message": "Must be a future date" }] } }
```
- JSON keys are `camelCase`. Repositories/mappers convert MySQL `snake_case` columns.
- `meta` appears only on paginated lists; `warnings` only when non-empty. `204` responses have no body.
- Error `code` values are stable, uppercase identifiers (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `DUPLICATE_APPLICATION`, `DEADLINE_PASSED`, `NOT_ELIGIBLE`, `INVALID_STATUS_TRANSITION`, `CONFLICT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`).

### 9.3 Status Codes
`200` OK · `201` Created (include the new resource) · `204` No Content · `400` malformed/invalid input · `401` unauthenticated · `403` forbidden (incl. bad CSRF token) · `404` not found/hidden · `409` conflict (duplicates, invalid transitions, locked fields, concurrent edit, dependent records) · `429` rate limited · `500` unexpected · `503` a required database is unavailable. Do not use `200` with an error body.

### 9.4 Validation and Error Handling
- Validate `params`, `query`, and `body` with Zod through a `validate` middleware; reject unknown keys; coerce types explicitly (e.g., `z.coerce.number().int().positive()` for ids).
- Throw `AppError(code, httpStatus, message, details?)` from services. A single centralized error middleware formats responses. Express 5 forwards async errors automatically; on Express 4 wrap handlers with an `asyncHandler`.
- The error middleware maps driver errors: `ER_DUP_ENTRY` → 409; `ER_NO_REFERENCED_ROW_2` → 400/409; `ER_ROW_IS_REFERENCED_2` → 409; `ER_CHECK_CONSTRAINT_VIOLATED` → 400; Mongoose `ValidationError`/`CastError` → 400; Mongo duplicate key `11000` → 409; Mongoose `VersionError` → 409.
- Never return stack traces, SQL text, or driver messages to clients outside development.

### 9.5 Pagination, Filtering, Sorting
- `?page=1&limit=10` (default limit 10, max 100). Always return `meta`.
- Filters are explicit query params with allowlisted names (e.g., `status`, `companyId`, `branchId`, `q` for text search, `from`/`to` for dates).
- Sorting: `?sort=registrationDeadline` or `?sort=-createdAt` (leading `-` = descending) against an allowlist mapped to real columns.
- Default sort orders are deterministic (add `id` as a tiebreaker).

### 9.6 Versioning
Routes are unversioned under `/api` while there is a single client. If a breaking change is unavoidable, introduce `/api/v2` for the affected resources and document it; do not change existing response shapes silently.

### 9.7 Admin Provisioning
There is no admin-registration endpoint. Admins are created via `npm run admin:create` (backend script) which prompts for credentials (or reads them from environment variables) and hashes the password. Never hardcode admin credentials in code, seeds, or docs.

---

## 10. Authentication and Security Standards

### 10.1 Passwords
- Hash with the single chosen algorithm (bcrypt cost ≥ 12, or Argon2id). Never log, return, or select `password_hash` outside the auth repository method that needs it.
- Policy: minimum 8 characters; with bcrypt, **reject passwords longer than 72 bytes** (bcrypt truncates silently). No arbitrary composition rules.
- Login errors are generic ("Invalid email or password") for unknown email and wrong password alike. Inactive accounts cannot log in.

### 10.2 Sessions and Cookies
- `express-session` with a persistent store (a MySQL-backed session store). `MemoryStore` only in unit tests.
- Cookie flags: `httpOnly: true`; `secure: true` in production; `sameSite: 'lax'` (use `'none'` + `secure` only if the frontend is truly cross-site, and then document why); a custom cookie name; sensible `maxAge` (idle timeout, e.g., 2 hours, configurable via env).
- `app.set('trust proxy', ...)` correctly when deployed behind a reverse proxy, otherwise `secure` cookies will not be set.
- **Regenerate the session on login** (`req.session.regenerate`) to prevent fixation. On logout: destroy the session, clear the cookie, return `204`/`200`.
- Never store authentication tokens in `localStorage`/`sessionStorage`. Never expose session ids in JSON.
- Session data holds only `userId` and `role` (and `studentId`/`adminId` if useful) — re-load authoritative data from the DB when needed.

### 10.3 CSRF
Cookie-based auth requires CSRF protection on every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`). Use a maintained mechanism (e.g., a session-bound synchronizer token or a double-submit-cookie library such as `csrf-csrf`; **not** the deprecated `csurf`) and additionally verify the `Origin` header against `CLIENT_ORIGIN`. The SPA fetches a token from `GET /api/auth/csrf-token` and the Axios instance sends it in a header (e.g., `X-CSRF-Token`) on mutating requests. Auth endpoints (`login`, `register`) are also protected.

### 10.4 Authorization
See §4. Every protected route has `requireAuth` and, where applicable, `requireRole`. Add an integration test proving a student receives `403` on each admin endpoint and cannot read another student's data.

### 10.5 Input and Injection Safety
- SQL: parameterized only (§5). MongoDB: validated primitives only, no raw operator objects from clients (§6.3).
- XSS: render user text through React's default escaping. **`dangerouslySetInnerHTML` is forbidden**; announcement bodies are plain text (Markdown rendering requires an approved sanitizer). Validate `links[].url` as `http(s)` only.
- Limit body size (`express.json({ limit: '100kb' })`).

### 10.6 Transport, Headers, CORS, Rate Limiting
- `helmet` enabled. CORS allows only `CLIENT_ORIGIN` (comma-separated allowlist from env) with `credentials: true`; never `*` with credentials.
- Rate limits (`express-rate-limit`): strict on `POST /auth/login` and `/auth/register` (e.g., 10 attempts / 15 min per IP, configurable), moderate globally. Return `429` with code `RATE_LIMITED`.

### 10.7 Privacy, Logging, Secrets
- Do not log passwords, cookies, CSRF tokens, session ids, emails, phone numbers, CGPA, or request bodies for auth/profile routes. Log ids, route, status, latency, and a request id. Configure logger redaction paths.
- Student records are returned only to the owner and to admins. Repositories use explicit column lists so sensitive columns are never selected accidentally.
- `.env` is git-ignored; only `.env.example` (placeholders) is committed. If a secret is ever committed, rotate it and report it — do not just delete the file.
- Seeds and fixtures use obviously fake data (`student01@example.edu`).

---

## 11. Frontend Architecture and UI Standards

### 11.1 Requirements
Functional components and Hooks only; reusable components; consistent layouts; responsive (mobile-first Tailwind); accessible forms; explicit **loading, empty, error, and success** states on every data view; search, filtering, sorting, and pagination on list pages; client-side validation (UX only — the server is authoritative). A clean, professional academic look — no gratuitous animation or complexity.

### 11.2 Shared Components (build these first, in `components/`)
`Button`, `Input`, `Select`, `Textarea`, `FormField` (label + error + hint), `Modal`/`ConfirmDialog`, `DataTable` (with sort headers), `Pagination`, `SearchBar`/`FilterBar`, `StatusBadge` (drive and application statuses), `Spinner`/`Skeleton`, `EmptyState`, `ErrorState` (with retry), `Toast` (via context), `PageHeader`, `Card`. Keep each under ~150 lines; split when larger.

### 11.3 Routes

| Area | Routes |
|---|---|
| Public | `/` (landing), `/login`, `/register` |
| Student | `/student/dashboard`, `/student/profile`, `/student/companies`, `/student/companies/:id`, `/student/drives`, `/student/drives/:id`, `/student/drives/:id/timeline`, `/student/applications`, `/student/announcements` |
| Admin | `/admin/dashboard`, `/admin/companies`, `/admin/companies/new`, `/admin/companies/:id/edit`, `/admin/drives`, `/admin/drives/new`, `/admin/drives/:id/edit`, `/admin/drives/:id/rounds`, `/admin/drives/:id/schedule`, `/admin/applications`, `/admin/announcements`, `/admin/reports` |

Selection-status management lives in `/admin/applications`. `ProtectedRoute` and `RoleRoute` are navigation conveniences only; the backend enforces access. Lazy-load admin routes with `React.lazy` where it helps bundle size.

### 11.4 Forms and Errors
- Labels associated with inputs, `aria-invalid`/`aria-describedby` for errors, visible focus rings, keyboard-operable dialogs with focus trapping and Escape to close, sufficient color contrast, status conveyed by text (not color alone), `aria-live` regions for toasts.
- Map API `error.details[]` (`field`, `message`) onto form fields. Disable submit buttons while a mutation is pending to prevent double submits.
- Dates: send/receive ISO UTC; display with a single formatter in `utils/` (institution timezone). Never format dates ad hoc in components.

### 11.5 Component and Logic Boundaries
- Components render; hooks fetch/mutate; `services/` compute. Eligibility, transition validity, and permissions are decided by the **backend**; the client only displays results (e.g., disables "Apply" when `myEligibility.eligible` is false and shows the reasons).
- Global context is limited to auth state and toasts. Do not put server data into context or Redux-style stores — TanStack Query is the server-state store.

---

## 12. Dynamic UI Updates Without Full Page Reloads (Mandatory)

### 12.1 Stack and Conventions
- One Axios instance in `frontend/src/api/axiosClient.js`: `baseURL` from `VITE_API_BASE_URL` (or relative `/api` with the Vite proxy), `withCredentials: true`, CSRF header attachment on mutating requests, response interceptor that unwraps the envelope/normalizes errors. On `401` it clears the auth cache (`queryClient.clear()`) and navigates with React Router — **never** `window.location.reload()` or full-page redirects for in-app navigation.
- A single `queryKeys.js` factory defines all keys, for example `['companies', filters]`, `['company', id]`, `['drives', filters]`, `['drive', id]`, `['drive', id, 'rounds']`, `['applications', 'me']`, `['admin', 'applications', filters]`, `['announcements', filters]`, `['auth', 'me']`, `['reports', 'overview']`. Do not hand-write key arrays in components.
- Hooks wrap queries/mutations (`useCompanies`, `useCreateCompany`, `useApplyToDrive`, …). Components do not call Axios directly.
- Default `QueryClient` options: `staleTime` ≈ 30 s, `retry` once and never on `4xx`, `refetchOnWindowFocus: true`.

### 12.2 Invalidation Map (after a **successful** mutation)

| Mutation | Invalidate |
|---|---|
| Create/update/delete company | `['companies']`, `['company', id]`, drive/posting lists showing company data |
| Create/update/delete job posting | `['job-postings']`, parent company key |
| Create/update drive, change drive status | `['drives']`, `['drive', id]`, `['reports','overview']` |
| Save rounds/schedule/checklist | `['drive', id]`, `['drive', id, 'rounds']`, student schedule keys |
| Student applies / withdraws | `['applications','me']`, `['drive', id]`, student dashboard key |
| Admin changes application status | `['admin','applications']`, `['reports','overview']` |
| Publish/update announcement | `['announcements']` |
| Update student profile/academic records | `['student','me']`, `['drives']` (eligibility flags change) |

### 12.3 Required Behaviors (acceptance examples)
1. Admin adds a company → the company table shows it without reload.
2. Admin edits a recruitment schedule → the admin view reflects saved data immediately.
3. Student opens a drive → details load asynchronously with a loading state, then render.
4. Student submits an application → "My applications" and the drive's apply button update without reload.
5. Admin publishes an announcement → student dashboards show it after the next refetch (focus or poll).

### 12.4 Cross-User Freshness
React does **not** provide real-time cross-user sync. Use, in order of preference:
1. `refetchOnWindowFocus` and `refetchOnReconnect` (default).
2. `refetchInterval` (e.g., 30–60 s) on student dashboard, drive details, announcements, and "My applications", with `refetchIntervalInBackground: false`.
3. **Socket.IO — only with approval** and a stated reason polling is inadequate. If used: authenticate sockets via the session, emit *invalidation hints* (e.g., `{ type: 'drive.updated', id }`) with no student PII, and have the client call `queryClient.invalidateQueries`. Polling must remain as fallback.

### 12.5 Optimistic Updates
Allowed only for low-risk, easily reversible UI (e.g., toggling a pinned flag in the admin UI) with `onError` rollback and `onSettled` invalidation. **Not allowed** for applications, status changes, eligibility-gated actions, or anything the server may reject on business rules.

---

## 13. DBMS Concepts and Academic Demonstration

### 13.1 Rule
Agents MUST maintain `docs/dbms-concepts.md`. Whenever a DBMS concept is implemented or changed, update its entry **in the same change**. Implement concepts only where they serve a real feature; do not add artificial features to pad the list. Correct and meaningful beats numerous.

### 13.2 Entry Template

````markdown
### <Concept name>
- **Definition:** …
- **Why required:** …
- **Where implemented:** `<file path>` (table / collection / view / script)
- **Example query:**
  ```sql
  -- or db.collection.aggregate([...])
  ```
- **Expected result:** …
- **Project use case:** …
````

### 13.3 Concept Coverage Matrix (planned — set status to "Implemented" only after verifying the code and query)

| Concept | Intended location | Status |
|---|---|---|
| Relational modeling, ER relationships | `docs/er-diagram.md` (Mermaid), `schema.sql` | Planned |
| Normalization (1NF–3NF, the no-`company_id`-on-drives decision) | schema + `docs/dbms-concepts.md` | Planned |
| Primary/foreign keys, referential integrity, delete rules | migrations | Planned |
| Constraints (`UNIQUE`, `NOT NULL`, `CHECK`, `ENUM`) | migrations | Planned |
| Joins | `v_drive_overview`, `database/mysql/queries/` | Planned |
| Subqueries / `EXISTS` | eligible-students query | Planned |
| Views | `v_*` views | Planned |
| Indexing + `EXPLAIN` evidence | migrations, `queries/` | Planned |
| Transactions and ACID (apply, status change, registration) | services + `tests/db` | Planned |
| Aggregation (`GROUP BY`/`HAVING`) | reports queries | Planned |
| Stored procedure / trigger (only if justified) | migrations | Optional |
| Document databases, embedded documents, flexible schema | `recruitment_processes` | Planned |
| MongoDB CRUD, filters, projections | repositories, `database/mongodb/queries/` | Planned |
| MongoDB aggregation | schedule/round-type/documents pipelines | Planned |
| Schema validation (Mongoose + `$jsonSchema`) | `database/mongodb/schemas/` | Planned |
| Relational vs. document trade-offs; cross-DB consistency | `docs/dbms-concepts.md`, `docs/architecture/` | Planned |

### 13.3.1 Other Required Documents
`docs/er-diagram.md` (Mermaid ER diagram), `docs/mongodb-schema.md` (documents, indexes, embedding rationale), `docs/api-documentation.md` (every endpoint: auth, request, response, errors), `docs/setup-guide.md` (install, env, migrate, seed, run, demo accounts), `docs/architecture/` (ADRs, assumptions register, consistency trade-offs).

---

## 14. Coding Standards

### 14.1 Naming

| Item | Convention | Example |
|---|---|---|
| React components / files | `PascalCase.jsx` | `DriveCard.jsx` |
| Hooks | `useXxx.js` | `useApplyToDrive.js` |
| Frontend non-component files | `camelCase.js` | `queryKeys.js` |
| Backend files | `camelCase` + role suffix | `companyController.js`, `companyService.js`, `companyRepository.js`, `companyRoutes.js`, `companyValidator.js` |
| Variables/functions | `camelCase`, verbs for functions | `getDriveById` |
| Constants/enums | `UPPER_SNAKE_CASE` | `APPLICATION_STATUS` |
| MySQL tables/columns | `snake_case`, plural tables, `id` PK, `<singular>_id` FK | `student_applications.drive_id` |
| MySQL constraints/indexes | `pk_`, `fk_<table>_<ref>`, `uq_<table>_<cols>`, `chk_<table>_<rule>`, `idx_<table>_<cols>` | `uq_applications_drive_student` |
| MySQL views | `v_` prefix | `v_drive_overview` |
| Mongo collections | `snake_case` plural | `recruitment_processes` |
| Mongo fields, API JSON | `camelCase` | `placementDriveId` |
| API paths | kebab-case, plural nouns | `/placement-drives` |
| Migrations | `NNNN_description.sql` | `0003_create_drives.sql` |

### 14.2 General Rules
- ES modules, `async/await` (no mixed callbacks/`.then` chains), `const` by default, strict equality, no `var`.
- Small functions with one purpose; controllers stay thin; files that grow past ~300 lines are split; React components past ~150 lines are split.
- Errors: throw `AppError` in services; never swallow errors silently; never `catch` just to `console.log`. Use the logger, not `console.log`, in committed backend code.
- Comments explain *why*, not *what*. Every SQL file and non-trivial query has a header comment stating its purpose and the DBMS concept it demonstrates. JSDoc on exported service/repository functions is encouraged.
- SQL: one query per named repository function; uppercase SQL keywords; qualified column names in joins; explicit column lists; queries stored as readable multi-line template literals **without interpolated user input** (or in `.sql` files).
- Mongoose: one model per file; schemas define types, `required`, enums, bounds, defaults, and indexes; use `timestamps: true`; use `.lean()` for read-only queries.
- Formatting: Prettier + ESLint (fail on warnings in CI); do not disable lint rules broadly or commit reformatting of unrelated files.

### 14.3 Avoid
Giant components/controllers; duplicated business logic (client *and* server rules must have one authoritative source: the server); hardcoded credentials/URLs; unnecessary abstractions and premature generalization; dead or commented-out code; `TODO` stubs or placeholder implementations presented as complete features (if something is unfinished, say so explicitly and track it); `SELECT *`; `console.log` debugging left in.

---

## 15. Testing and Verification

### 15.1 Environments and Layout
- Tests use dedicated databases (`placement_test` in MySQL and in MongoDB). **Never run tests against development or production data.** Test setup applies migrations and resets data between suites; refuse to run if the configured database name does not end in `_test`.
- Layout: `tests/backend/unit`, `tests/backend/integration`, `tests/db` (constraint, transaction, and validation tests that hit real databases), `tests/e2e` (Playwright). Frontend component tests are co-located (`*.test.jsx`) and use React Testing Library with MSW (no real network).
- Prefer real MySQL/MongoDB in integration tests over mocks; mock only external boundaries.

### 15.2 Coverage Targets by Area

| Area | Level | Must verify |
|---|---|---|
| Authentication | Integration | Register creates student only (role in body ignored, BR-17); login/logout; session regeneration; generic error messages; inactive user blocked; rate limit returns 429 |
| Authorization | Integration | Student gets 403 on every admin route; unauthenticated gets 401; student cannot read another student's application/profile; draft drive is 404 for students |
| CSRF | Integration | Mutating request without/with wrong token is rejected |
| Company CRUD | Integration | Validation, duplicate name 409, delete blocked when postings exist |
| Drive CRUD & lifecycle | Integration + DB | Valid/invalid status transitions, publish preconditions (BR-18), draft-only delete, locked fields (BR-13/14) |
| Eligibility | Unit + Integration | Each criterion passes/fails individually (CGPA boundary, backlogs boundary, branch, graduation year); failed-criteria reasons returned |
| Deadline | Integration | Application rejected after deadline using DB time; accepted just before (BR-03) |
| Duplicate application | DB + Integration | Unique constraint; two concurrent applies yield one row and one 409 |
| Recruitment-round ordering | Unit + Integration | Non-contiguous/duplicate `roundNumber` rejected (BR-06); out-of-order schedules rejected |
| MySQL constraints | DB | PK/FK/UNIQUE/CHECK violations are rejected directly via SQL |
| MySQL transactions | DB | Failure mid-apply or mid-status-change leaves no partial rows (e.g., no application without history) |
| MongoDB validation | DB | Invalid enums, bad `scheduledAt`, duplicate `placementDriveId`, forbidden keys rejected; optimistic-concurrency conflict returns 409 |
| Cross-database consistency | Integration | Rounds save for nonexistent drive rejected; Mongo failure leaves drive as a valid draft; read degrades with warning; reconciliation reports orphans |
| API validation | Integration | Unknown keys, wrong types, operator-injection payloads (`{"$gt":""}`) rejected; pagination/sort allowlists |
| React components | Component | Loading, empty, error, success states; form error mapping; role-based nav |
| Dynamic updates | Component/E2E | After a mutation the list updates with no navigation event/page reload (query invalidation) |
| Responsive UI | E2E | Key pages usable at mobile (~375 px) and desktop widths; no horizontal scroll on core pages |
| Primary flows | E2E | Student: register → complete profile → browse → apply → see status. Admin: login → create company/posting/drive/rounds → publish → shortlist → select |

### 15.3 Rules
- New or changed business rules require a test that references the rule id (e.g., `// BR-03`).
- Do not skip, weaken, or delete a failing test to make a run pass; fix the cause or ask.
- **Report only what you ran.** If tests were not run (e.g., databases unavailable), say so explicitly and list the exact command the user should run. Never write "all tests pass" without having executed them in this session.
- Before reporting work complete, run the applicable commands: lint, format check, unit/integration tests for touched areas, frontend build when frontend code changed, and migrations on a clean test database when schema changed.

---

## 16. Implementation Phases

Work phase by phase; do not start a later phase's features before the current phase's exit criteria are verified, unless the user directs otherwise.

### Phase 1 — Project Initialization
Repository structure (only what is needed), frontend (Vite + Tailwind) and backend (Express) scaffolds, ESLint/Prettier, `.gitignore`, `.env.example`, npm scripts (§2.4), Vite `/api` proxy, `README.md` stub.
**Exit criteria:** `npm run dev` starts both apps; `GET /api/health` returns 200 (no DB dependency required); lint and format pass; `.env` is git-ignored; `README.md` lists chosen Node/package versions.

### Phase 2 — Database Architecture
`docs/er-diagram.md`, MySQL migrations + `schema.sql`, views, indexes, seed data, Mongo Mongoose models + `$jsonSchema` + indexes, `docs/mongodb-schema.md`, first `docs/dbms-concepts.md` entries, migration runner.
**Exit criteria:** `db:migrate` applies cleanly to an empty database and is re-runnable; every table has the constraints in §5.3; seed loads without errors; `tests/db` constraint tests pass; Mongo validators reject invalid documents in tests; ER diagram matches the schema.

### Phase 3 — Backend Foundation
Env validation, MySQL pool + `withTransaction`, Mongoose connection, error handling, Zod validation middleware, sessions, CSRF, auth endpoints, role middleware, rate limiting, logging with redaction, `admin:create` script.
**Exit criteria:** register/login/logout/me work; role and CSRF integration tests pass; unauthenticated/unauthorized access returns 401/403; admin cannot be created via the API; no secret appears in logs.

### Phase 4 — Admin Functionality
Companies, job postings, drives (+ status lifecycle), eligibility, recruitment rounds/schedule/checklist (Mongo), announcements, and the corresponding admin UI.
**Exit criteria:** CRUD and lifecycle tests pass; publish preconditions enforced; cross-database workflows in §7.4 tested including Mongo failure; admin UI lists update without reload; `docs/api-documentation.md` covers all admin endpoints.

### Phase 5 — Student Functionality
Student profile/academic records, dashboard, company browsing, drive details with eligibility display, recruitment timeline, applications, withdrawal, announcements.
**Exit criteria:** BR-01…BR-05, BR-10, BR-15, BR-16 covered by passing tests; student cannot see drafts or others' data; apply flow is transactional (application + history).

### Phase 6 — Dynamic Frontend Behavior
Complete TanStack Query integration, `queryKeys.js`, invalidation map (§12.2), polling/refetch-on-focus, consistent loading/empty/error/success states, shared component set.
**Exit criteria:** each acceptance example in §12.3 verified (manually or by test) with no page reload; no component calls Axios directly; no `window.location.reload()` in the codebase.

### Phase 7 — Reports and DBMS Demonstrations
`GET /api/admin/reports/overview` (SQL aggregates + Mongo aggregation merged in the service), demo queries in `database/*/queries/`, `EXPLAIN` evidence for indexes, completed `docs/dbms-concepts.md`.
**Exit criteria:** every concept marked "Implemented" in §13.3 has a working example query, expected result, and code location; report endpoint tested.

### Phase 8 — Testing and Final Documentation
Gaps in tests, E2E flows, responsive checks, bug fixes, `docs/setup-guide.md`, final DBMS report, demonstration checklist.
**Exit criteria:** full test suite and lint pass on a clean clone following only `setup-guide.md`; E2E flows pass; documentation matches the code; demo script (login as admin, create/publish drive, apply as student, change status, show SQL/Mongo queries and views) runs end to end.

---

## 17. Instructions for AI Coding Agents

Before changing anything, and throughout the task, you MUST:

1. **Read this file** before making changes; re-read the sections relevant to the task.
2. **Inspect relevant existing files** before editing; check `git status` and do not overwrite uncommitted user work.
3. **Understand database ownership** (§7.1) before introducing any new field.
4. **Preserve the approved stack** (§2). Do not swap libraries or frameworks.
5. Prefer **minimal, targeted changes**; do not refactor unrelated code.
6. **Avoid unnecessary dependencies** (§2.3).
7. Follow the **naming and architecture conventions** (§3, §14).
8. Keep **business logic out of React components** (§11.5).
9. Keep **database access out of Express route handlers/controllers** — repositories only.
10. **Validate all inputs on the backend.**
11. **Enforce role permissions on every protected endpoint** (§4).
12. **Never expose secrets or sensitive student data** (§10.7).
13. **Create a new migration** for every MySQL schema change; never edit applied migrations.
14. **Update MongoDB validation (Mongoose and `$jsonSchema`) and indexes** when document structures change.
15. **Update `docs/api-documentation.md`** when endpoints change.
16. **Update `docs/dbms-concepts.md`, `docs/er-diagram.md`, `docs/mongodb-schema.md`** when schemas or concepts change.
17. **Add or update tests** for the behavior you change.
18. **Run applicable validation commands** (lint, format check, tests, build, migrations) after changes.
19. **Report what changed and what was tested** (§19).
20. **Never claim completion without verification.**
21. **Never introduce AI-based application features** (§0.1).
22. **Never silently change core architecture or database ownership;** propose an ADR and wait for approval.
23. **Ask for clarification** when a decision could materially affect scope or data integrity (see §20 open decisions). Otherwise state your assumption and proceed.
24. **Keep the project suitable for a college-level DBMS demonstration:** understandable, well-documented, demonstrable.

### 17.1 Forbidden Actions
- Committing `.env`, credentials, session secrets, database dumps with real data, or `node_modules`.
- Destructive database operations (`DROP`, `TRUNCATE`, bulk `DELETE`, `deleteMany({})`) against anything other than the dedicated test databases, without explicit user approval.
- Editing an already-applied migration; running seeds or demo-account scripts when `NODE_ENV=production`.
- Concatenating user input into SQL, passing raw request objects into Mongo queries, using `SELECT *`, or enabling `multipleStatements`.
- Storing auth tokens in browser storage, using `dangerouslySetInnerHTML`, or reloading the page to refresh data.
- Disabling security middleware, CSRF, rate limiting, or lint rules to make something work.
- Skipping/deleting failing tests, or reporting unexecuted tests as passed.
- `git push --force`, rewriting shared history, or committing unrelated changes — unless explicitly asked.

---

## 18. Definition of Done

A feature is done only when **all** apply:
- [ ] Intended behavior is implemented and manually or automatically exercised.
- [ ] Backend validation (Zod) is present for all inputs.
- [ ] Authentication and authorization are enforced on the backend and tested (401/403 paths).
- [ ] Database operations preserve integrity: constraints, transactions, and the cross-database rules in §7 are respected.
- [ ] The frontend handles loading, empty, error, and success states, and data updates without a page reload.
- [ ] Relevant tests are added/updated and **executed** (or the exact reason they could not be run is reported).
- [ ] Lint and format checks pass.
- [ ] Documentation is updated (API docs, DBMS concepts, ER/Mongo schema docs, setup guide where affected).
- [ ] No unnecessary dependencies; `npm audit` results reported if dependencies changed.
- [ ] No secrets or sensitive data are exposed in code, logs, or responses.
- [ ] The change follows the project architecture and serves the DBMS objectives.

---

## 19. Agent Communication and Workflow

1. **Plan first for non-trivial work.** State the plan: goal, files to touch, data ownership, migrations needed, tests to add. Wait for confirmation when the change is large, ambiguous, or touches schema/architecture.
2. **Work in small, reviewable increments** (one concern per change). Do not rewrite unrelated code.
3. **Separate done from proposed.** Use explicit wording: *Implemented and verified*, *Implemented, not verified*, *Proposed / not started*.
4. **State assumptions** when requirements are ambiguous and add them to `docs/architecture/` (assumptions register) if they affect behavior.
5. **Summarize changed files** after implementation.
6. **Report executed commands and outcomes** verbatim in substance (command, pass/fail, notable output). Never invent results.
7. **List limitations and follow-ups** (known gaps, deferred decisions, technical debt introduced).

**Final report template**
```text
Summary: <what changed and why>
Files changed: <list>
Database changes: <migrations / Mongo schema or index changes, or "none">
Docs updated: <list, or "none">
Commands run: <command → result> (or "not run: <reason>")
Tests: <added/updated; executed? pass/fail counts>
Assumptions: <list>
Limitations / follow-ups: <list>
```

---

## 20. Assumptions Register and Open Decisions

Keep this list current; mirror it in `docs/architecture/assumptions.md`. Changing an assumption requires user approval.

| ID | Assumption |
|---|---|
| A-01 | CGPA/SGPA use a 0–10 scale; values are stored with two decimals. |
| A-02 | A placement drive covers exactly one job posting. |
| A-03 | Eligibility uses the student's latest `academic_records` row (via `v_student_academic_summary`); CGPA is not stored on `students`. |
| A-04 | Announcements are stored in MongoDB (`placement_announcements`). |
| A-05 | Students may view active companies and drives in `published`, `completed`, and `cancelled` states (clearly labeled); `archived` drives remain visible only inside a student's own application history. |
| A-06 | When consecutive rounds both have `scheduledAt`, a later round does not start before an earlier one. Schedules may be `null` (TBD). |
| A-07 | A withdrawn application is final; the student cannot re-apply to the same drive. |
| A-08 | All admins have identical permissions; there are no sub-roles. |
| A-09 | After applications exist, eligibility criteria are locked; the registration deadline may only be extended. |
| A-10 | Profile completeness (name, enrollment number, branch, graduation year, ≥ 1 academic record) is required to apply. |
| A-11 | Eligibility is evaluated at apply time and not retroactively re-evaluated. |
| A-12 | Timestamps are stored in UTC and displayed in the institution timezone (default `Asia/Kolkata`). |
| A-13 | Sessions are stored in MySQL via a maintained session store. |
| A-14 | Academic data is self-reported by students; an admin verification workflow is out of scope unless approved. |

**Open decisions — ask before implementing:** one-student-one-offer policy (restrict applications after `selected`?); academic-data verification; in-app read/unread tracking for announcements; email/SMS notifications; whether Socket.IO is justified; final choice between bcrypt and Argon2id (record as an ADR).

---

## 21. Project Status

Update this table only when a phase's exit criteria (§16) have been **verified**. If unsure, inspect the repository and run the checks rather than trusting this table.

| Phase | Status |
|---|---|
| 1 — Project initialization | Not started |
| 2 — Database architecture | Not started |
| 3 — Backend foundation | Not started |
| 4 — Admin functionality | Not started |
| 5 — Student functionality | Not started |
| 6 — Dynamic frontend behavior | Not started |
| 7 — Reports and DBMS demonstrations | Not started |
| 8 — Testing and final documentation | Not started |
