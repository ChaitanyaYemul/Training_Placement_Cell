# Database summary

MySQL is the transactional authority. All domain tables use InnoDB, utf8mb4, integer primary keys, explicit foreign keys, constrained statuses and UTC timestamps. Eighteen immutable migrations plus the migration ledger define the schema; `database/mysql/schema.sql` is the reference snapshot. [ER diagram](er-diagram.md) contains the relationships and attributes.

| Table                      | Responsibility and integrity                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| users                      | Unique email, password hash, active flag and server-authoritative role                    |
| students / admins          | Unique user reference; student enrollment is unique; branch reference                     |
| branches                   | Unique branch codes/names                                                                 |
| academic_records           | Unique student/semester, bounded CGPA/SGPA/backlogs; latest semester supplies eligibility |
| companies                  | Unique name; deactivation preserves referenced history                                    |
| job_postings               | Company foreign key; constrained job type and nonnegative compensation                    |
| placement_drives           | Posting foreign key, lifecycle/deadline/eligibility criteria; no duplicated company id    |
| drive_eligible_branches    | Composite primary key; drive/branch membership                                            |
| student_applications       | Unique student/drive, constrained status; no hard deletion                                |
| application_status_history | Append-only application transitions with actor/time; no hard deletion                     |
| app_sessions               | Persistent expiring sessions, managed by the session store                                |
| schema_migrations          | Immutable migration checksum/state tracking                                               |

Views: `v_drive_overview` resolves company/posting context; `v_student_academic_summary` resolves latest-semester academics; `v_application_details` joins application context; `v_placement_stats_by_branch` aggregates branch results. Index examples and measured EXPLAIN evidence live in [DBMS concepts](dbms-concepts.md).

MongoDB collections `recruitment_processes` and `placement_announcements` use both Mongoose and database validators. A unique numeric placementDriveId links each recruitment document to MySQL. Bounded rounds/checklists are embedded, schedules can be null, and optimistic version checks prevent silent replacement. Announcements contain audience targeting and optional drive references. [Full document shapes and indexes](mongodb-schema.md).

Applications and history commit atomically in MySQL; individual recruitment writes are atomic in MongoDB. Cross-database changes follow ordered, retryable operations. Reports combine SQL and Mongo aggregates in services; reconciliation reports orphan documents and missing/empty published-drive processes. No shared transaction is claimed.
