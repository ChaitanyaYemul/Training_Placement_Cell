# Approved assumptions

Mirrored unchanged from AGENTS.md §20. No assumption was changed in Phase 2.

| ID   | Assumption                                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-01 | CGPA/SGPA use a 0–10 scale; values are stored with two decimals.                                                                                                                                       |
| A-02 | A placement drive covers exactly one job posting.                                                                                                                                                      |
| A-03 | Eligibility uses the student's latest `academic_records` row (via `v_student_academic_summary`); CGPA is not stored on `students`.                                                                     |
| A-04 | Announcements are stored in MongoDB (`placement_announcements`).                                                                                                                                       |
| A-05 | Students may view active companies and drives in `published`, `completed`, and `cancelled` states (clearly labeled); `archived` drives remain visible only inside a student's own application history. |
| A-06 | When consecutive rounds both have `scheduledAt`, a later round does not start before an earlier one. Schedules may be `null` (TBD).                                                                    |
| A-07 | A withdrawn application is final; the student cannot re-apply to the same drive.                                                                                                                       |
| A-08 | All admins have identical permissions; there are no sub-roles.                                                                                                                                         |
| A-09 | After applications exist, eligibility criteria are locked; the registration deadline may only be extended.                                                                                             |
| A-10 | Profile completeness (name, enrollment number, branch, graduation year, ≥ 1 academic record) is required to apply.                                                                                     |
| A-11 | Eligibility is evaluated at apply time and not retroactively re-evaluated.                                                                                                                             |
| A-12 | Timestamps are stored in UTC and displayed in the institution timezone (default `Asia/Kolkata`).                                                                                                       |
| A-13 | Sessions are stored in MySQL via a maintained session store.                                                                                                                                           |
| A-14 | Academic data is self-reported by students; an admin verification workflow is out of scope unless approved.                                                                                            |

**Open decisions — ask before implementing:** one-student-one-offer policy (restrict applications after `selected`?); academic-data verification; in-app read/unread tracking for announcements; email/SMS notifications; whether Socket.IO is justified; final choice between bcrypt and Argon2id (record as an ADR).

Phase 3 resolved the hashing choice with explicit user approval: Argon2id, recorded in ADR 001. AGENTS.md remains unchanged; this decision must not be requested again as an unresolved preference.

## Final-phase reporting and operator assumptions

These complete the user-authorized remaining scope without changing A-01–A-14:

- Date filters select a cohort by the drive's registration deadline, using inclusive UTC calendar dates. Historical application results remain recorded even when current academics change.
- Selection counts count selected applications; placed-student counts use distinct students. A student may have several selections because no one-offer policy was approved.
- Current eligibility is informational, evaluated with the same backend eligibility function as applications; it is not a historical eligibility snapshot and does not revoke existing applications.
- Reconciliation follows AGENTS.md §7.5: default scans only; missing/empty published processes are flagged for administrators. An optional interactive, audited repair can remove only rechecked orphan recruitment documents, never application/history records or valid processes.
- Demo credentials are generated locally into an ignored private file; no fixed administrator password is committed. Demo provisioning refuses production and requires isolated `_demo` databases.
- Production preparation targets one Node API process behind a trusted HTTPS reverse proxy with same-origin static SPA hosting. Existing in-process rate limits require additional shared infrastructure before scaling API replicas.
