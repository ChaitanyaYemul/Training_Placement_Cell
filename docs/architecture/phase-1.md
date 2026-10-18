# Phase 1 decisions and scope

The user's initialization request authorizes this phase. The uploaded AGENTS.md was read before any changes. The subsequently fetched main branch contains the same AGENTS.md byte-for-byte; its contents and phase-status table remain unchanged.

Use an npm workspace with one lockfile, a React/Vite frontend and an Express backend. Frontend request flow is page → query hook → API function → Axios. Backend flow is router → controller → service; no repository is needed until a database operation exists.

Only the runtime settings used now (`NODE_ENV`, `PORT`, `CLIENT_ORIGIN`) are validated at startup. Future database/session/CSRF values are documented in backend/.env.example but unused. Phase 1 explicitly requires no database dependency for liveness. Invalid active settings refuse startup without printing values.

Student and admin pages are public, labeled layout previews. They display no real data and provide no protected actions. Authentication, authorization and backend CSRF protection must precede any real role-specific data or mutations. Auth cache/401 navigation handling will be implemented with authentication, not simulated here.

MySQL remains the future source of truth for relational records and sessions; MongoDB will own recruitment processes and announcements. No schema, migration, driver, account, hashing choice, or connection is implemented. Reserved database/admin scripts exit nonzero and perform no work, so they cannot be mistaken for completed features.

All A-01 through A-14 assumptions in AGENTS.md remain unchanged. Open decisions, including password hashing, are deferred until their phase and require approval there. No AI/ML features or dependencies are introduced.
