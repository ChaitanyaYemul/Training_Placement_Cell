# DBMS concepts — implemented foundation and executed demonstrations

These entries describe actual Phase 2 schema/code and database tests. Expected results below use dedicated test fixtures, not a claim that reference seeds create student/admin accounts or drive records. MySQL 8.4.11 and MongoDB 8.0.34 were used. Production services, eligibility enforcement and report APIs remain later work.

## Relational modeling and 3NF

- **Definition:** Relational modeling separates entities and functional dependencies; 3NF avoids non-key attributes depending on other non-key attributes.
- **Why required:** The same company can offer several roles and drives without conflicting duplicated company data.
- **Where implemented:** `database/mysql/migrations/0001…0011; docs/er-diagram.md`.
- **Example query/code:**

```sql
SELECT id, job_posting_id, title FROM placement_drives WHERE id = 1;
```

- **Expected result:** Fixture drive 1 points to its posting; company_id is absent from the drive schema.
- **Project use case:** Drive → posting → company; branch reference normalization; CGPA exists only on academic records.

## Keys, constraints and referential integrity

- **Definition:** Primary keys identify rows; foreign keys and UNIQUE/CHECK/NOT NULL constraints reject invalid relationships and values.
- **Why required:** Prevent duplicate applications, missing parents and invalid academic values even if HTTP validation is bypassed.
- **Where implemented:** `database/mysql/migrations/0001…0011; tests/db/mysql.test.js`.
- **Example query/code:**

```sql
INSERT INTO academic_records (student_id, semester, sgpa, cgpa) VALUES (99999, 1, 8, 8);
```

- **Expected result:** Rejected with ER_NO_REFERENCED_ROW_2; separate executed tests reject CGPA >10, duplicates and invalid ENUMs.
- **Project use case:** Protect student records and ensure exactly one application per student/drive (BR-04), including concurrent inserts.

## Many-to-many relationships and composite keys

- **Definition:** A bridge stores a relationship using a composite key rather than a repeated list.
- **Why required:** A drive permits several branches and a branch participates in many drives.
- **Where implemented:** `0009_create_drive_eligible_branches.sql`.
- **Example query/code:**

```sql
SELECT drive_id, branch_id FROM drive_eligible_branches WHERE drive_id = 1;
```

- **Expected result:** One CSE relationship in the test fixture; duplicate pairs are prohibited by the composite PK.
- **Project use case:** Eligibility branch membership without arrays or comma-separated fields in SQL.

## Joins and projected views

- **Definition:** A join combines related records on keys; a view exposes a reusable projection without redundant stored master data.
- **Why required:** Render drive/posting/company information while keeping each entity authoritative.
- **Where implemented:** `0012_create_v_drive_overview.sql; 0014_create_v_application_details.sql`.
- **Example query/code:**

```sql
SELECT company_name FROM v_drive_overview WHERE id = 1;
```

- **Expected result:** Example Campus Labs in the test fixture.
- **Project use case:** Drive overview and application detail retrieval. View access must still be restricted by future services.

## Correlated subqueries and EXISTS

- **Definition:** A correlated subquery uses an outer row; EXISTS tests relationship membership without duplicating results.
- **Why required:** Latest academics and eligible branch membership are relational questions.
- **Where implemented:** `0013_create_v_student_academic_summary.sql; queries/eligible_students.sql`.
- **Example query/code:**

```sql
SELECT semester, cgpa FROM v_student_academic_summary WHERE student_id = 1;
```

- **Expected result:** Semester 2 and CGPA 8.00 from the highest-semester fixture record; eligibility demonstration returns student 1.
- **Project use case:** Academic summary uses MAX(semester), not duplicated student CGPA. Demo eligibility SQL is not a production eligibility service.

## Aggregation, GROUP BY, HAVING and distinct counts

- **Definition:** Aggregation summarizes sets; HAVING filters grouped results; DISTINCT prevents counting a student twice.
- **Why required:** Compare branch placements and selected applications by company.
- **Where implemented:** `0015_create_v_placement_stats_by_branch.sql; queries/company_selections.sql`.
- **Example query/code:**

```sql
SELECT branch_code, student_count, selected_student_count FROM v_placement_stats_by_branch WHERE branch_code = 'CSE';
```

- **Expected result:** Demonstration fixture: CSE has one student and one distinct selected student. Company selection query returns one selected application.
- **Project use case:** Branch summary includes branches with zero selections through LEFT JOINs; multiple offers do not inflate distinct selected-student counts.

## Composite indexes and actual EXPLAIN

- **Definition:** An index narrows access paths; EXPLAIN reports the optimizer-selected plan for a particular data set.
- **Why required:** Avoid scanning all drives, applications or history for common filters.
- **Where implemented:** `Migration index declarations; database/mysql/queries; tests/db/demonstrations.test.js`.
- **Example query/code:**

```sql
EXPLAIN SELECT d.id, d.title, d.registration_deadline FROM placement_drives AS d WHERE d.status = 'published' AND d.registration_deadline >= '2030-01-01' ORDER BY d.registration_deadline, d.id LIMIT 10;
```

- **Expected result:** Fixture plan uses idx_drives_status_deadline with range access. Other recorded plans are listed below; large-data performance is not claimed.
- **Project use case:** Match leftmost composite columns to status/deadline, student/status, drive/status, branch/year, application/date filters.

## MySQL transactions and ACID rollback

- **Definition:** An InnoDB transaction commits all included statements or rolls them back together.
- **Why required:** An application insert must not survive a failing history write in future application services.
- **Where implemented:** `backend/src/repositories/transaction.js; tests/db/mysql.test.js`.
- **Example query/code:**

```sql
START TRANSACTION;
INSERT INTO student_applications (drive_id, student_id) VALUES (1, 1);
-- In the test, the following history insert uses a nonexistent changed_by user.
-- withTransaction catches the FK failure and issues ROLLBACK.
```

- **Expected result:** Executed rollback test leaves zero application rows; separate successful transaction test persists application plus history.
- **Project use case:** The transaction helper/DB behavior is verified; registration/application/status services and their complete business rules are not implemented.

## Deletion guards and immutable history

- **Definition:** A BEFORE DELETE trigger can reject destructive operations independently of API code.
- **Why required:** History must not disappear when a user or drive is removed.
- **Where implemented:** `0016_protect_student_applications.sql; 0017_protect_application_status_history.sql`.
- **Example query/code:**

```sql
DELETE FROM application_status_history WHERE application_id = 1;
```

- **Expected result:** Rejected with SQLSTATE 45000 in the dedicated test schema; referenced parent deletes also fail via FKs.
- **Project use case:** BR-12 protection only. Triggers do not duplicate state-transition logic. Restrict application DDL privileges separately.

## Document modeling, embedding and referencing

- **Definition:** Bounded child structures can be embedded atomically; independent master records are referenced.
- **Why required:** Companies use varying recruitment rounds, schedules and checklist requirements.
- **Where implemented:** `backend/src/models/mongodb/recruitmentProcessModel.js; docs/mongodb-schema.md`.
- **Example query/code:**

```js
db.recruitment_processes.find(
  { placementDriveId: 1 },
  { _id: 0, requiredDocuments: 1 },
);
```

- **Expected result:** Only the requiredDocuments checklist is projected; company/student master fields are absent.
- **Project use case:** One bounded document per drive makes recruitment-process reads/writes local while MySQL remains authoritative for the drive.

## Schema validation at model and database boundaries

- **Definition:** Mongoose validates application documents; MongoDB collection validators also reject raw-driver writes.
- **Why required:** Bypassing the model must not permit invalid enums, dates, unsafe keys, ordering or size.
- **Where implemented:** `database/mongodb/schemas/definitions.js; models/mongodb; tests/db/mongodb.test.js`.
- **Example query/code:**

```js
db.recruitment_processes.insertOne({ placementDriveId: '1' });
```

- **Expected result:** Rejected as an invalid document (code 121). Real tests also reject invalid schedules, duplicate/gapped round numbers, unsafe nested fields, excessive sizes and invalid announcements.
- **Project use case:** Maintain matching Mongoose and BSON rules with bounded flexible fields and explicit indexes.

## Unique and multikey document indexes

- **Definition:** A unique index prohibits duplicate keys; a multikey index indexes array members.
- **Why required:** There can be only one recruitment process per drive, with many scheduled rounds.
- **Where implemented:** `collectionDefinitions indexes; tests/db/mongodb.test.js`.
- **Example query/code:**

```js
db.recruitment_processes.getIndexes();
```

- **Expected result:** Unique uq_recruitment_drive and idx_rounds_schedule exist; inserting a duplicate drive fails with code 11000.
- **Project use case:** Lookup/upsert by drive id and scheduling on embedded rounds; announcement status/date and related-drive indexes are also verified.

## MongoDB aggregation pipelines

- **Definition:** Stages filter, unwind, group, sort and project documents into useful summaries.
- **Why required:** Build a student schedule and demonstrate recruitment patterns without copying relational master data.
- **Where implemented:** `database/mongodb/queries/pipelines.js; tests/db/demonstrations.test.js`.
- **Example query/code:**

```js
db.recruitment_processes.aggregate([
  { $unwind: '$rounds' },
  { $group: { _id: '$rounds.roundType', count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]);
```

- **Expected result:** The sample process yields assessment:1 and interview:1; upcoming schedule yields one dated round; common-documents pipeline yields two checklist entries.
- **Project use case:** Schedule, round-type distribution and checklist-frequency demonstrations. No report API or AI analytics is implemented.

## Optimistic concurrency and single-document atomicity

- **Definition:** A version key prevents one writer from silently overwriting a document read before another writer saved changes.
- **Why required:** Two administrators must not silently replace each other's recruitment configuration.
- **Where implemented:** `recruitmentProcessModel optimisticConcurrency; tests/db/mongodb.test.js`.
- **Example query/code:**

```js
const first = await Recruitment.findById(id);
const second = await Recruitment.findById(id);
first.requiredDocuments = ['Resume'];
await first.save();
second.requiredDocuments = ['College ID'];
await second.save();
```

- **Expected result:** Second save rejects with Mongoose VersionError on an actual database. Future API middleware must map it to 409.
- **Project use case:** Model .save() concurrency guarantee; bulk/raw update callers must implement their own version-aware update policy.

## Cross-database consistency and ownership

- **Definition:** Two independent databases have no shared ACID transaction or cross-engine foreign key.
- **Why required:** Recruitment documents must refer to valid relational drives without duplicating master data.
- **Where implemented:** `backend/src/services/sampleSeedService.js; docs/architecture/database-ownership.md`.
- **Example query/code:**

```js
await seedRecruitmentSamples(pool, connection, 99999, 1);
```

- **Expected result:** Rejected before Mongo insertion when the MySQL drive does not exist. Repeated valid sample seeds produce one process and one announcement without overwriting documents.
- **Project use case:** Only sample-seed reference checks/idempotency are implemented. General write orchestration, read degradation and orphan reconciliation are planned, not claimed.

## Observed EXPLAIN evidence

Captured by the actual `tests/db/demonstrations.test.js` run on the small deterministic fixture. Each corresponding query returned one row. Plans can change as data/statistics grow; no FORCE INDEX was used. The latest raw plan artifact is ignored at `test-results/database-explain.json`.

| Query                       | Access         | Chosen key                                   | Other observation                                                                                                                |
| --------------------------- | -------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| status/deadline drives      | range          | idx_drives_status_deadline                   | Index condition                                                                                                                  |
| student/status applications | ref            | idx_applications_student_status              | Index condition                                                                                                                  |
| drive/status applications   | ref            | uq_applications_drive_student                | idx_applications_drive_status was also a possible key; optimizer chose the unique-key prefix and a filesort on this tiny fixture |
| company postings            | ref            | idx_job_postings_company                     | FK index used                                                                                                                    |
| branch/year cohort          | ref            | idx_students_branch_year                     | Composite filter                                                                                                                 |
| application history         | ref            | idx_history_application_changed              | Timeline lookup                                                                                                                  |
| academic EXISTS eligibility | mixed          | PRIMARY / uq_academic_student_semester       | Two academic rows were scanned in one join; correlated MAX used the academic unique index                                        |
| company selection aggregate | index + eq_ref | idx_applications_drive_status + primary keys | Temporary grouping/filesort on fixture                                                                                           |

## Coverage limits

Schema integrity, four views, example joins/subqueries/aggregates, index existence/plans, transaction helper behavior, history guards, document validation, projections/aggregations, unique indexes, concurrency and seed reference checks are implemented and tested at the database layer. No stored procedure was needed. Authentication/session storage, service-level business workflows, API authorization, complete eligibility/transition enforcement, general cross-database recovery and reconciliation remain unimplemented. These are not represented as passing integration features.

## Persistent sessions and transactional identity creation (Phase 3 auth commit)

Authentication adds app_sessions through migration 0018: a binary-collated primary session id, unsigned epoch expiry, JSON-valid session payload and expiry index. express-mysql-session reads/touches/deletes actual rows; tests verify expiration and logout invalidation. The auth repository creates users plus a student/admin profile inside withTransaction, so a failed child insert cannot leave a partial identity. Password hashes remain in users only and are selected only by the auth credential method. Role checks reload authoritative users instead of trusting client or cookie role values.
