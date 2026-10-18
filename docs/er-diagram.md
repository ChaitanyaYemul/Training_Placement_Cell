# MySQL ER diagram — Phase 2

This diagram describes the implemented InnoDB schema, not future API endpoints. `database/mysql/schema.sql` contains every column, default and constraint; the 17 migrations are authoritative. All surrogate ids are `INT UNSIGNED`; the eligibility bridge uses its two foreign keys as its composite primary key.

```mermaid
erDiagram
  users ||--o| students : has_student_profile
  users ||--o| admins : has_administrator_profile
  branches o|--o{ students : groups
  students ||--o{ academic_records : records
  companies ||--o{ job_postings : offers
  job_postings ||--o{ placement_drives : recruits_through
  users ||--o{ placement_drives : authors
  placement_drives ||--o{ drive_eligible_branches : permits
  branches ||--o{ drive_eligible_branches : qualifies
  students ||--o{ student_applications : submits
  placement_drives ||--o{ student_applications : receives
  student_applications ||--o{ application_status_history : records
  users ||--o{ application_status_history : changes
  users {
    int id PK
    varchar email UK
    varchar password_hash
    enum role
    boolean is_active
    datetime last_login_at
  }
  students {
    int id PK
    int user_id FK,UK
    varchar enrollment_number UK
    varchar full_name
    varchar phone
    int branch_id FK
    smallint graduation_year
  }
  admins {
    int id PK
    int user_id FK,UK
    varchar full_name
    varchar designation
  }
  branches {
    int id PK
    varchar code UK
    varchar name UK
  }
  academic_records {
    int id PK
    int student_id FK
    tinyint semester
    decimal sgpa
    decimal cgpa
    smallint active_backlogs
  }
  companies {
    int id PK
    varchar name UK
    varchar industry
    varchar website
    text description
    varchar headquarters
    varchar contact_email
    boolean is_active
  }
  job_postings {
    int id PK
    int company_id FK
    varchar title
    text description
    enum job_type
    decimal ctc_lpa
    varchar location
    boolean is_active
  }
  placement_drives {
    int id PK
    int job_posting_id FK
    varchar title
    text description
    enum status
    datetime registration_deadline
    datetime drive_date
    decimal min_cgpa
    smallint max_active_backlogs
    smallint eligible_graduation_year
    int created_by FK
  }
  drive_eligible_branches {
    int drive_id PK,FK
    int branch_id PK,FK
  }
  student_applications {
    int id PK
    int drive_id FK
    int student_id FK
    enum status
    datetime applied_at
    datetime updated_at
  }
  application_status_history {
    int id PK
    int application_id FK
    enum from_status
    enum to_status
    int changed_by FK
    varchar remarks
    datetime changed_at
  }
```

Tables with editable records also have `created_at` and `updated_at` UTC DATETIME columns (users, students, admins, academic_records, companies, job_postings, placement_drives). Reference branches and the eligibility bridge have no timestamp requirement. Bookkeeping `schema_migrations` is not a domain entity.

## Integrity and normalization

- Unique keys: users.email; branches.code/name; students.user_id/enrollment_number; admins.user_id; academic_records(student_id, semester); applications(drive_id, student_id). The eligibility bridge's PK prevents duplicate branch eligibility.
- FK deletes default to RESTRICT. Only academic_records.student_id and drive_eligible_branches.drive_id use CASCADE, because those rows have no independent lifecycle. Applications/history additionally have BEFORE DELETE rejection triggers (BR-12), including an application with no history yet.
- CHECK constraints enforce CGPA/SGPA 0–10, semester 1–12, nonnegative CTC, boolean 0/1, nonempty required text, graduation years 2000–2200, and nonidentical historical from/to states. Unsigned numeric types reject negative counts in strict SQL mode. ENUMs constrain vocabularies, not state transitions.
- Students may start with NULL enrollment/name/branch/year so future registration can precede profile completion. Multiple NULL enrollment numbers are permitted; non-NULL enrollments are unique. Publish-time eligibility fields may be NULL on drafts; future service validation will enforce BR-18. Full administrator names, drive deadlines and foreign-key parent ids are required.
- 1NF: no branch lists or recruitment-round arrays in SQL. 2NF: bridge attributes depend on the whole composite key. 3NF: company data appears only in companies, drive company is derived via its posting, branch names appear only in branches, and student CGPA is derived from the highest-semester academic record. Eligibility scalars belong directly to the drive; a redundant one-to-one eligibility table would add no independent entity.
- Roles are defined on users. FK constraints enforce identity existence; consistency between a user's role and its profile/author actions will be enforced in future services. No authentication or role enforcement is claimed here.

## Views

| View                          | Purpose                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `v_drive_overview`            | Drive → posting → company join, without duplicated company ids on drives                                        |
| `v_student_academic_summary`  | Student plus highest-semester academic row; incomplete profiles remain visible with NULL academics              |
| `v_application_details`       | Application, student, drive, posting, company projection; future access must be owner/admin restricted          |
| `v_placement_stats_by_branch` | All branches, distinct student totals and distinct selected students; a student with several offers counts once |

Views use SQL SECURITY INVOKER. They do not expose password hashes. No session-store table is created before the session implementation selects its schema in Phase 3.
