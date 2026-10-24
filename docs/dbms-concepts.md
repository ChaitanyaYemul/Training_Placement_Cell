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
- **Project use case:** Drive overview and application detail retrieval. Application access is restricted by owner/role predicates in the current services.

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
- **Why required:** Application submission/withdrawal/status updates must not survive a failing history write.
- **Where implemented:** `backend/src/repositories/transaction.js; backend/src/services/studentApplicationService.js; backend/src/services/applicationStatusService.js; tests/db/mysql.test.js; tests/business/studentApplicationIntegrity.test.js`.
- **Example query/code:**

```sql
START TRANSACTION;
INSERT INTO student_applications (drive_id, student_id) VALUES (1, 1);
-- In the test, the following history insert uses a nonexistent changed_by user.
-- withTransaction catches the FK failure and issues ROLLBACK.
```

- **Expected result:** Executed rollback test leaves zero application rows; separate successful transaction test persists application plus history.
- **Project use case:** Registration, submission, withdrawal and administrator status services use real transactions. Controlled history failures roll back actual MySQL application/status writes.

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

## Coverage limits (historical Phase 2)

Schema integrity, four views, example joins/subqueries/aggregates, index existence/plans, transaction helper behavior, history guards, document validation, projections/aggregations, unique indexes, concurrency and seed reference checks are implemented and tested at the database layer. No stored procedure was needed. Authentication/session storage, service-level business workflows, API authorization, complete eligibility/transition enforcement, general cross-database recovery and reconciliation remain unimplemented. These are not represented as passing integration features.

## Persistent sessions and transactional identity creation (Phase 3 auth commit)

Authentication adds app_sessions through migration 0018: a binary-collated primary session id, unsigned epoch expiry, JSON-valid session payload and expiry index. express-mysql-session reads/touches/deletes actual rows; tests verify expiration and logout invalidation. The auth repository creates users plus a student/admin profile inside withTransaction, so a failed child insert cannot leave a partial identity. Password hashes remain in users only and are selected only by the auth credential method. Role checks reload authoritative users instead of trusting client or cookie role values.

## Phase 3 business API operations

The catalog repositories execute parameterized company/posting/drive CRUD with explicit columns, validated sort maps, count queries and pagination. Visibility/ownership predicates filter active companies, student-visible drives and own application rows. Foreign keys translate orphan inserts/referenced deletes into sanitized 400/409 responses. Student academic replacement locks its parent and replaces only owned rows in a transaction.

Drive creation inserts a draft and eligible-branch rows atomically in MySQL. Publication uses the database UTC clock and checks existing Mongo rounds before changing SQL status. Recruitment saves share the drive row lock with publication and use Mongoose optimistic concurrency/version-aware edits. Mongo reads/writes are still independent operations; HTTP tests verify safe retry behavior and controlled partial failure, and a separate real-outage test stops/restarts the local MongoDB instance.

The application-status service is the single transition authority for current administrator status APIs. It locks an application, validates the transition, updates status and appends history in one InnoDB transaction. Submission/withdrawal were deferred from Phase 3; their Phase 5 implementation and tests are described below.

Announcement CRUD uses projections/explicit document DTOs, escaped literal search, publication/expiry/audience predicates and bounded pagination. The optional relatedDriveId NULL path was corrected in the Mongoose validator to match the already documented BSON schema; no historical SQL migration or approved data-ownership assumption changed.

## Phase 5: concurrent, transactional student applications

- **Definition:** Row locks serialize conflicting decisions; a UNIQUE constraint is the final duplicate guard; a conditional INSERT evaluates the deadline on the database clock at the write itself.
- **Why required:** Two browser requests must not create duplicate applications or partial history, and academic/lifecycle edits cannot race an eligibility decision.
- **Where implemented:** `backend/src/services/studentApplicationService.js`, `backend/src/services/applicationStatusService.js`, `backend/src/repositories/applicationRepository.js`, `backend/src/repositories/studentRepository.js`; verified by `tests/business/studentApplications.test.js`, `tests/business/studentApplicationIntegrity.test.js` and `tests/outage/mongo.test.js`. Existing schema constraints/indexes are reused; no migration is needed.
- **Example query (guarded insert inside the service transaction):**

```sql
INSERT INTO student_applications (drive_id, student_id)
SELECT id, ? FROM placement_drives
WHERE id = ? AND status = 'published'
  AND UTC_TIMESTAMP() < registration_deadline;
```

- **Expected result:** Eligible concurrent requests yield one 201 and one duplicate 409, exactly one application and one initial history row. A deadline reached before INSERT yields no row. An initial history failure rolls back the application; a withdrawal failure rolls back both the status and history. Concurrent selection/withdrawal commits one valid terminal transition and rejects the other. Tests use actual MySQL plus deterministic lock barriers rather than guessed sleeps.
- **Project use case:** The service locks the drive, then student parent, then latest academic row. The academic replacement service locks the same student parent. This ensures eligibility uses one committed profile/academic revision; the existing shared eligibility function stays authoritative. A later academic change does not revoke a prior application. Withdrawal locks the owned application and appends history atomically.

## Phase 5: consistent history and archived context

- **Definition:** A single SELECT over relational joins reads one consistent snapshot, with an owner predicate restricting student access.
- **Why required:** A student must never see another student's application or a status from one revision paired with history from another. Archiving a drive must preserve the student's history.
- **Where implemented:** `applicationRepository.detail`; history joins use the existing application/date index.
- **Example query:**

```sql
SELECT a.id, a.status, h.from_status, h.to_status, h.changed_at
FROM student_applications AS a
LEFT JOIN application_status_history AS h ON h.application_id = a.id
WHERE a.id = ? AND a.student_id = ?
ORDER BY h.changed_at, h.id;
```

- **Expected result:** The owner sees ordered history and archived-drive summary; another student receives 404. History is bounded by terminal transitions, so no separate paginated history collection is necessary. Application/drive names remain relational joins, not duplicated Mongo documents or snapshots.
- **Project use case:** Application detail/history remains SQL-only and works during an actual Mongo outage, as do submission and withdrawal. The browser invalidates cached application/drive/dashboard views only after server success.
