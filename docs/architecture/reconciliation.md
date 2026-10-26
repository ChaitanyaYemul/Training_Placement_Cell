# Cross-database reconciliation

MySQL owns placement drives; MongoDB recruitment documents reference those IDs. A failed Mongo cleanup after a committed draft deletion can leave an orphan. There is no shared transaction and no automatic reconstruction of recruitment content.

## Read-only report

From the repository root, with the documented backend database settings:

```sh
npm run reconcile -w backend
```

The CLI reads only drive IDs/statuses and recruitment metadata. Its JSON log reports `counts`, `orphans`, `missing`, and `empty`. Orphans have no matching drive of any status. Missing/empty findings concern **published** drives only; draft drives may legitimately have no process. Output includes document IDs, drive IDs, version and update timestamp, without document text, student data or credentials. Repeated scans with unchanged data return the same report. Exit status is `0` when clean, `2` when findings need attention, and `1` for invalid arguments or an operational failure. Both databases must be readable; a failure never produces a misleading clean result.

An administrator fixes a published missing/empty process through the existing recruitment editor, supplying the actual rounds and checklist. The script cannot infer that information and never invents, overwrites, or deletes referenced documents. The scan itself is not a cross-database snapshot; a concurrent write may cause a transient finding. Rescan before acting.

## Optional, operator-confirmed orphan removal

The CLI supports the explicit maintenance action specified by AGENTS.md §7.5:

```sh
npm run reconcile -w backend -- --fix --audit-file /private/operator/path/reconciliation.jsonl
```

Choose an existing private directory outside the repository for the audit file. Both input and output must be interactive terminals. After printing the full scan, the command requires the exact phrase `DELETE N ORPHAN RECRUITMENT DOCUMENTS`, where N is the reported count. A mismatch leaves all data intact. There is no unattended confirmation flag. Run reconciliation with `npm run reconcile -w backend`; the npm script invokes `backend/scripts/reconcile.js` directly.

Each candidate is handled separately:

1. Start a MySQL `REPEATABLE READ` transaction and select the candidate primary key `FOR UPDATE`. If it now exists, retain the Mongo document and audit `referenced`. If absent, the gap lock prevents a parent with that ID being inserted during removal.
2. Append and fsync an `orphan_delete_intent` event to a private regular audit file. Symlinks and group/world-readable destinations are rejected. A failed audit write aborts before deletion.
3. Delete at most one Mongo document, matching the scanned `_id`, `placementDriveId`, `__v`, and `updatedAt`. A changed or already absent document is retained/reported as `changed_or_absent`.
4. Append and fsync `orphan_delete_result` with the outcome, then release the MySQL guard. Each event includes a run ID and UTC timestamp. A final read-only scan reports remaining findings.

The MySQL guard protects the reference check; it **does not roll back a Mongo deletion**. If a process or disk fails between deletion and its result audit, the already-durable intent records what was attempted. Stop, retain the audit, and run a read-only scan to determine the actual state before retrying. Repeated cleanup of the same snapshot removes nothing further. No application, history, announcement, drive, or other MySQL row is deleted or updated.

Assumption: application writers update recruitment documents through the existing versioned Mongoose repository; direct operator writes that bypass both version and timestamp are outside that concurrency contract. Database credentials and the terminal constitute operator authorization; this maintenance CLI is not exposed as an HTTP endpoint.

## Implementation and tests

`reconciliationService.js` combines `reconciliationMysqlRepository.js` and `reconciliationMongoRepository.js`; all database access remains in repositories. `reconciliationAudit.js` handles append-only file output. No schema migration or new collection is required.

`tests/business/reconciliation.test.js` exercises real database mismatches, read-only repeatability, required confirmation/audit, idempotent fixes, parent creation after scanning, concurrent Mongo edits, failures, and a competing insert blocked by the missing-key gap lock. `tests/backend/unit/reconciliationAudit.test.js` verifies private append-only auditing and CLI argument/terminal safeguards. Destructive fix verification uses dedicated test fixtures only; production cleanup is not part of the demo or final verification.

On Windows, Unix mode bits do not describe file privacy. Newly created audit files receive a protected NTFS ACL allowing only the current owner, SYSTEM and Administrators; existing files with other allowed principals are rejected. ACL validation runs through Windows PowerShell/.NET with an encoded literal path, hidden window and bounded timeout. POSIX systems retain the mode-0600 check and no-follow open. Both paths reject non-regular files and multiple hard links; Windows also rejects reparse points and verifies that the checked path still identifies the opened file. No metadata is appended until privacy checks succeed.
