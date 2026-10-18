# MongoDB document design — Phase 2

MongoDB owns only `recruitment_processes` and `placement_announcements`. It does not own company, job-posting, student, drive-core, application, history, or session data. Company-specific recruitment information means per-drive round `details` and `additionalRequirements`; company master data stays in MySQL.

## Recruitment processes

One bounded document per MySQL drive, enforced by unique `placementDriveId`. Cross-database references are positive integers no larger than 4294967295, never string ids. `_id` remains a MongoDB ObjectId.

```js
{
  placementDriveId: 1, // MySQL placement_drives.id
  rounds: [{
    roundNumber: 1, roundName: 'Assessment', roundType: 'assessment',
    description: '', mode: 'online', scheduledAt: ISODate('2030-11-15T09:30:00Z'),
    details: { durationMinutes: 60, platform: 'College lab' }
  }],
  requiredDocuments: ['College ID Card'],
  additionalRequirements: { instructions: 'Bring college identification.' },
  schemaVersion: 1, updatedBy: 1, // MySQL users.id
  createdAt: ISODate('2030-01-01T00:00:00Z'),
  updatedAt: ISODate('2030-01-01T00:00:00Z'), __v: 0
}
```

- Rounds are embedded because they are read/updated together, belong to one drive, and are bounded to 20 entries. BR-06 requires ascending contiguous round numbers 1..n. Empty arrays are valid for drafts; published-drive preconditions remain future service rules.
- Types: screening, assessment, group_discussion, interview, hr, other. Modes: online, offline, hybrid. Schedules are actual BSON dates or NULL, not raw date strings. A later consecutive scheduled round cannot precede its predecessor (A-06); either schedule may be TBD.
- Checklist strings are unique, trimmed, nonempty, at most 120 characters and 30 entries. These are informational document requirements; file uploads are absent.
- Flexible objects allow JSON primitives, arrays up to 30 values and objects up to 30 properties per level, with object/array nesting depths 0–3 (primitives may occur at depth 4). Strings are bounded to 2000 characters and finite numbers to ±1e12. Keys starting with `$`, containing `.`, or named `__proto__`, `constructor`, `prototype` are rejected recursively.
- Round names are at most 120 characters, descriptions at most 2000. The entire BSON document is capped at 65536 bytes. Unknown fixed-schema fields are rejected; empty flexible objects are retained.

## Announcements

Fields: title (1–160), body (1–10000, plain text), status (draft/published), priority (normal/important/urgent), audience `{ type: all|branches, branchIds: [] }`, relatedDriveId (MySQL integer or NULL), links `[{ label, url }]`, isPinned, publishedAt/expiresAt (date or NULL), createdBy (MySQL users.id), timestamps and Mongoose version key.

Branch audiences require 1–100 unique branch ids; all audiences require an empty id array. Up to 10 links use only HTTP(S) URLs, each with a nonempty label. Published documents require publishedAt. Visibility filtering by publication time/expiry/audience belongs to future repositories/services; a valid database document alone does not imply visibility or authorization.

## Two validation layers and indexes

Mongoose models live under `backend/src/models/mongodb/`. Strict schemas reject unknown fixed fields, apply documented defaults, validate flexible bounds, and set timestamps. `recruitment_processes` uses optimisticConcurrency: true, with real `.save()` conflict detection through `__v`.

Collection definitions in `database/mongodb/schemas/definitions.js` use `$jsonSchema` plus `$expr` for contiguous round numbers, consecutive schedule order, publication/audience rules and BSON size. They protect raw-driver writes as well as Mongoose writes. BSON dates and integers are enforced at the database boundary; Mongoose may cast string inputs before validation, so future HTTP inputs still need Zod validation. Model defaults supply empty arrays/objects and NULL schedules; raw inserts must supply every required field.

| Collection              | Index                         | Why                                            |
| ----------------------- | ----------------------------- | ---------------------------------------------- |
| recruitment_processes   | unique `{placementDriveId:1}` | One process per drive; lookup/upsert           |
| recruitment_processes   | `{'rounds.scheduledAt':1}`    | Multikey recruitment scheduling queries        |
| placement_announcements | `{status:1,publishedAt:-1}`   | Published announcements in chronological order |
| placement_announcements | `{relatedDriveId:1}`          | Announcements associated with one drive        |

Run `npm run mongo:setup -w backend` explicitly with configured `.env`. It creates collections or applies collMod validation and then creates indexes, and can run repeatedly without deleting documents. Collection/model autoCreate and autoIndex are disabled on runtime connections. Existing invalid documents are not silently repaired by collMod; audit existing data before introducing a later validator revision. Version 1 is the initial documented shape; future changes require matching model/validator/docs updates and an explicit migration plan.

## Referencing and partial failure

Drive/user/branch ids reference independent MySQL lifecycles and are not embedded master records. MongoDB cannot enforce a foreign key into MySQL. The sample-seed service verifies its drive and active-admin references in MySQL before writing Mongo documents. No other application write service exists yet. Future services must validate references, apply optimistic concurrency where relevant, and handle orphan/missing documents per AGENTS.md §7.

No ACID transaction spans databases. Sample document upserts are repeatable and preserve existing documents; a partial two-document seed can be rerun safely. General cross-database orchestration, read degradation, HTTP error mapping and reconciliation are deferred to later backend phases.
