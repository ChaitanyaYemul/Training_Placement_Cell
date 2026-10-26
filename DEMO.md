# College presentation walkthrough

This walkthrough uses real application records in isolated demo databases. Allow approximately 15 minutes. The accounts are fictional; passwords are generated locally and never committed.

## Prepare the demo once

Follow [setup-guide.md](docs/setup-guide.md) to install Node 24, npm 11, MySQL 8.4 and MongoDB 8 and run `npm ci`. Create an empty MySQL schema named `placement_demo` using your database administration tool. Copy `backend/.env.example` to `backend/.env.demo`; set `NODE_ENV=development`, configure MySQL for `placement_demo`, and set the Mongo URI's explicit database name to `placement_demo`. Use the same name ending in `_demo` for both databases. Supply independent session and CSRF secrets, and the correct browser origin. Keep the file private and ignored by Git.

Run from the repository root:

```sh
node --env-file=backend/.env.demo backend/scripts/migrate.js
node --env-file=backend/.env.demo backend/scripts/mongoSetup.js
node --env-file=backend/.env.demo backend/scripts/seed.js
node --env-file=backend/.env.demo backend/scripts/checkDatabases.js
npm run demo:provision -w backend
```

The reference seed creates CSE/ECE branches and a clearly fictional company/posting. Provisioning creates two accounts through the existing Argon2id authentication service:

| Role          | Email                      | Password                                                           |
| ------------- | -------------------------- | ------------------------------------------------------------------ |
| Administrator | `demo-admin@example.edu`   | Generated `admin.password` in `backend/.env.demo-credentials.json` |
| Student       | `demo-student@example.edu` | Generated `student.password` in that same private file             |

Open the credential file locally in your editor and copy passwords into the login forms; do not display it during screen sharing. It is created with mode `0600`, excluded by `.gitignore`, and never printed by provisioning. Keep it with your private demo configuration. Rerunning provisioning preserves passwords, accounts, profiles, applications and history. An existing account with different credentials causes a failure instead of a password reset. The command refuses production, test databases, mismatched database names, broad file permissions and symlinks. To prepare a separate independent demo, use a separate checkout and a new matching `_demo` database pair; never reset a live demonstration database.

Start the demo backend in one terminal and the frontend in another:

```sh
node --env-file=backend/.env.demo backend/src/server.js
```

```sh
npm run dev -w frontend
```

Open `http://localhost:5173`. Use two browser profiles or a normal and private window, one per role. Never sign in as both roles in two tabs sharing the same cookies.

## Present the complete workflow

1. **Introduce the architecture.** Show the landing page. Explain that MySQL owns accounts, eligibility, drives, applications and history; MongoDB stores embedded recruitment rounds, document checklists and announcements. Open [the ER diagram](docs/er-diagram.md) and [MongoDB schema](docs/mongodb-schema.md).
2. **Complete the student profile.** Sign in as the demo student. Open **My profile**. Enter name `Demo Student`, enrollment `DEMO-001`, branch **CSE**, and graduation year `2030`. Save. Add semester `1`, SGPA `8.50`, CGPA `8.00`, backlogs `0`, then save academic records. Explain that profile and academic information are self-reported and the latest semester determines eligibility.
3. **Manage a company and job.** In the other browser sign in as the demo administrator. Open **Companies**. Create `Campus Presentation Company` with industry `Software`, website `https://example.edu`, headquarters `Example City`, and an explanatory description. Add an active full-time posting titled `Graduate Developer`, description `Fictional presentation role`, CTC `6.50` LPA, location `Example City`. Note its posting ID. Use a unique company name if repeating this presentation.
4. **Create a draft drive.** Open **Drives**, then **New drive**. Choose the posting ID from step 3; title it `Campus Presentation Drive`. Set the registration deadline at least seven days in the future and the drive date after that. Set minimum CGPA `7.00`, maximum active backlogs `0`, graduation year `2030`, eligible branch **CSE**. Save. Explain that draft drives are hidden from students.
5. **Configure recruitment and publish.** Open the drive's recruitment editor. Add round 1 `Online Assessment`, type `assessment`, mode `online`; add round 2 `Technical Interview`, type `interview`, mode `offline`. Set chronological schedules after registration closes. Add `Resume`, `College ID Card`, and `Academic Transcripts` to the checklist. Save rounds, then publish from the drive page. Explain why MySQL and MongoDB have separate writes and why publication checks that at least one round exists.
6. **Publish an announcement.** Create an announcement titled `Presentation drive now open`, body `Eligible students may apply before the displayed deadline.`, audience **All**, and status **Published**. Use a publication time in the past or now. In the student's window open announcements and refresh to show the message.
7. **Apply as the student.** Open the drive list and the newly published drive. Show company/job context, server-computed eligibility, schedules and the checklist. Click **Apply** and confirm. Show the application detail page with its initial `applied` history event. Return to the drive and show that a duplicate application is unavailable. Explain the unique `(drive_id, student_id)` key and the transaction creating application plus history together.
8. **Review and select.** As admin, open **Applications**, locate the demo application and change `applied` to `shortlisted`, with remark `Assessment completed`. Then change `shortlisted` to `selected`, with remark `Selected after the technical interview`. In the student's window refresh application detail. Show both ordered history events and explain that official remarks are visible to the applicant. Terminal states cannot be changed arbitrarily.
9. **Show reporting.** As admin, open **Reports**. Filter by the new company/drive and CSE. Review placement totals, application status counts, company/branch results and current eligibility/participation. Export each report's CSV as needed. Explain selections versus distinct placed students and the documented date-cohort definition. Recruitment charts come from MongoDB aggregation. A student opening `/admin/reports` is redirected away; the API separately enforces admin-only access.
10. **Preserve historical records.** Complete then archive the drive. Show that it disappears from general student browsing while the student's application retains the drive/company context and full history. No application history is deleted. For withdrawal demonstration create a separate published drive, apply to it, and withdraw before selection; withdrawal is final.
11. **Demonstrate database concepts.** Use the documented queries in `database/mysql/queries/` and `database/mongodb/queries/`, and [dbms-concepts.md](docs/dbms-concepts.md). Show the latest-semester view, branch aggregate, a join and `EXPLAIN`, then Mongo embedded rounds and aggregation. Use database clients with credentials supplied privately; never place credentials in a presentation slide or shell command.
12. **Run a consistency scan.** With the demo settings, run `node --env-file=backend/.env.demo backend/scripts/reconcile.js`. Show the read-only report for orphan recruitment records and published drives missing usable recruitment details. Review [reconciliation.md](docs/architecture/reconciliation.md) before using any optional repair mode. Do not create or delete inconsistent records during the presentation.

## Before presenting

- Run the full checks in [setup-guide.md](docs/setup-guide.md) against dedicated `_test` databases; never point tests at the demo databases.
- Confirm the two demo accounts can sign in and that the deadline for the presentation drive is still in the future.
- Use one hostname consistently so session cookies and the Origin allowlist match.
- Close terminals or tabs containing credentials. Keep the credential file out of screenshots.
- The API applies genuine rate limits. If repeated logins trigger `429`, wait for the documented window; do not disable middleware.
- Existing records survive reruns. Use fresh company/drive names for another presentation and preserve completed application history.
