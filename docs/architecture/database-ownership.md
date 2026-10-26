# Database ownership and design decisions

## Ownership

| Data                                                                                  | Owner   | Reference policy                                           |
| ------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| users, students, admins, branches, academic records                                   | MySQL   | Foreign keys; no Mongo copies                              |
| companies, job postings, placement drive core/eligibility                             | MySQL   | One posting per drive; eligible branches via bridge        |
| applications and status history                                                       | MySQL   | InnoDB transactions; protected history                     |
| sessions                                                                              | MySQL   | Persistent app_sessions store (migration 0018)             |
| recruitment rounds, schedules, document checklists, per-drive company process details | MongoDB | Integer placementDriveId reference                         |
| announcements                                                                         | MongoDB | Optional relatedDriveId; author/branch ids reference MySQL |

The existing A-01…A-14 assumptions are unchanged and mirrored in assumptions.md. The request explicitly authorizes Phase 2 schema implementation. Neither authentication nor student/admin features are implemented.

## Relational decisions

The 11 domain tables implement 3NF. Eligibility scalars depend on the drive key and stay on placement_drives; the many-to-many branch relationship uses drive_eligible_branches. Company/branch names and student CGPA are not duplicated. Highest semester defines latest academics. Incomplete student profiles and draft eligibility may be NULL. Fixed graduation years are bounded to 2000–2200; future changes require new migrations. Ranges/ENUMs constrain stored values; eligibility decisions, profile completeness, role consistency, transitions and publish-time conditions remain future service responsibilities.

Two deletion-protection triggers implement only BR-12's history retention. They contain no duplicate status-transition logic. Referential deletion defaults to RESTRICT; only owned academic and eligibility child rows cascade. No DROP/TRUNCATE protection is possible with ordinary application privileges, so production-like users must not have DDL privileges. Test users are deliberately privileged only on disposable `_test` databases.

## Migration and seed operations

MySQL migrations are one trusted SQL statement per numbered immutable file, checked by SHA-256 against schema_migrations. A connection-scoped advisory lock serializes migration runs. MySQL DDL implicitly commits; this runner does not pretend that a whole migration batch is transactional. It records `started` before DDL and `applied` afterward; interrupted/failed DDL stops later runs for explicit repair. Missing/changed files and out-of-order versions fail closed. Never edit or reapply a migration to bypass a mismatch.

If interrupted, inspect the `started` filename, SHOW CREATE TABLE/VIEW/TRIGGER, and the schema_migrations ledger. Resolve the actual DDL outcome in a dedicated maintenance task; never automatically delete the ledger row or run an inverse DROP against development/production. Test suites intentionally recreate only verified `_test` databases.

MySQL reference/sample seeds run in a transaction under a seed advisory lock. Repeated seeds do not overwrite local changes. They create branches, a fictional company and one job posting, with no accounts, password hashes or student data. Mongo samples require an existing drive and active administrator and preserve existing documents. Seeds refuse NODE_ENV=production. Demo accounts are provisioned separately using Argon2id; see ../../DEMO.md.

## Connections and privileges

Database configuration is parsed centrally from environment variables, then required/validated only when a database operation is invoked. The public health server can still run without databases. MySQL uses mysql2 promises, a bounded pool, utf8mb4, UTC session/driver timezone, strict SQL mode, explicit columns and bound values. MongoDB uses a dedicated Mongoose connection with autoCreate/autoIndex disabled, explicit URI database names, and bounded server-selection timeout. Connections close in CLI/test cleanup paths.

A future runtime MySQL account should have only required SELECT/INSERT/UPDATE/DELETE permissions on the application schema, never DROP/GRANT/FILE. Run migrations through a separate schema-owner account with CREATE/ALTER/INDEX/REFERENCES/CREATE VIEW/SHOW VIEW/TRIGGER as needed. MongoDB setup needs collection administration/index privileges, while runtime should use application read/write privileges. Production TLS configuration and live deployment are not claimed here; never disable certificate validation.

## Cross-database consistency

No shared transaction exists. Implemented flows use the ordering/retry rules in AGENTS.md §7.4; relational master records commit first where appropriate, and Mongo writes remain retryable. Mongo lookup ids must be checked in MySQL. Read degradation and operator orphan reconciliation are implemented; see reconciliation.md. The sample-seed service alone demonstrates checked references and idempotent cross-database sample creation, without introducing placement business endpoints.
