# Database artifacts

- `mysql/migrations/`: 17 ordered, immutable single-statement migrations (11 domain tables, 4 views, 2 history-delete guards). Runner metadata adds schema_migrations.
- `mysql/schema.sql`: generated reference snapshot; apply migrations with `db:migrate`, never replay the snapshot into an existing database.
- `mysql/seed/`: repeatable, non-destructive single-statement reference/sample inserts; `mysql/seed.sql` is their reference snapshot. No users/password hashes/real student records.
- `mysql/queries/`: parameterized DBMS demonstrations exercised by integration tests, including EXPLAIN evidence.
- `mongodb/schemas/`: BSON collection validators and explicit index definitions shared with model configuration.
- `mongodb/seed/`: fictional recruitment/announcement samples requiring verified MySQL references.
- `mongodb/queries/`: executed aggregation pipelines for schedules, round types and document checklists.

MySQL owns relational master data, applications/history and future sessions. MongoDB owns only recruitment-process and announcement documents. See `docs/er-diagram.md`, `docs/mongodb-schema.md`, and `docs/architecture/database-ownership.md`.

Empty legacy `schemas/`/`migrations/` placeholder folders are reserved; no alternate MySQL schema authority or Mongo migration runner is implied. Schema changes require new SQL migrations and matching reference/docs updates; Mongo shape changes require coordinated model/validator/documentation updates.
