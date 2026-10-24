# Authentication security configuration

The runtime requires configured MySQL access, migration 0018, SESSION_SECRET and CSRF_SECRET (at least 32 characters each, securely generated, not example placeholders). SESSION_MAX_AGE_MS defaults to two hours; AUTH_RATE_LIMIT defaults to 10 combined login/register attempts per 15 minutes per process/IP. Production multi-instance shared rate limiting is not implemented; deploy one API process until that infrastructure is explicitly designed.

express-session uses a maintained express-mysql-session persistent store backed by app_sessions. Runtime table auto-creation is disabled; no MemoryStore is used. Cookies use a custom name placement.sid, HttpOnly, SameSite=Lax, and Secure in production. Rolling idle expiration updates the persistent expiry; login regenerates the session and invalidates its previous id. Logout destroys the stored session and clears the cookie. Every protected request rechecks the active user and authoritative role in MySQL. Concurrent password-change/session-revocation workflows are not implemented.

CSRF tokens are session-bound HMAC-SHA256 values derived from the unexposed session id and CSRF_SECRET. GET /api/auth/csrf-token initializes an anonymous persistent session and returns the token. All implemented writes, including register/login, require both an exact allowlisted Origin and X-CSRF-Token. Comparison uses a constant-time comparison after byte-length checking. Login returns a new token because the session id changes; clients must replace the previous token. Tokens have no independent expiry; their validity ends with the session. Anonymous registration does not log in the new account.

Configure CLIENT_ORIGIN as exact origins (no paths); never use wildcard credentialed CORS. TRUST_PROXY_HOPS defaults to 0. Set it to the exact trusted reverse-proxy hop count when terminating HTTPS upstream, and ensure clients cannot bypass that proxy. Secure cookies require HTTPS in production. No blanket trust-proxy setting is used.

Logs contain generated request ids, HTTP method, route template, status and latency. They do not contain request bodies, query strings, passwords, CSRF tokens, cookies, session ids or student PII. Error responses never expose driver messages, SQL or stack traces. SESSION_SECRET and CSRF_SECRET must be generated locally and stored securely in the deployment environment, never in Git or frontend VITE variables.

Administrator provisioning is operator-only through the CLI using ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD in a secure local environment. Do not pass passwords on the command line or create an admin through public registration. Shell/database access protects the CLI; no remote provisioning endpoint exists. Clear provisioning variables after use. No credentials are documented here.

## Business authorization and consistency

Every business router requires an authoritative active session. Administrator gates precede validation on privileged endpoints; student profile and own-application routes derive ownership from req.user.studentId. No role/userId/createdBy assignment is accepted from business request bodies. All implemented writes use the same CSRF and exact-origin protection as authentication. Numeric ids, sort/filter allowlists, bounded pagination and strict Zod bodies precede repository access.

The REST implementation keeps SQL and MongoDB calls in repositories. Drive/branch writes and academic replacements are transactional; application status changes lock their row and insert history in the same transaction. Publication/recruitment edits lock the MySQL drive to serialize precondition checks without pretending the Mongo write is part of a shared transaction. MongoDB errors degrade drive reads or return sanitized 503 for required writes. A real local Mongo outage test verifies the write error path. Orphan cleanup after draft deletion remains explicitly pending when Mongo is unavailable.

The full backend requires both databases at cold startup; read degradation covers a running instance's Mongo outage. Production deployment, distributed rate-limit storage, and full session revocation/password-change workflows remain outside this phase. Frontend auth integration is described below.

## Phase 4 browser integration

CSRF is kept only in memory, bootstrapped with cookie credentials, and replaced on session regeneration. No browser storage holds authentication tokens. Auth failure clears protected query data; invalid login does not masquerade as a session-expiry event. Service errors remain visible and do not silently label the user anonymous. Logout waits for the server; failed logout retains the signed-in state and shows an error. Session generations prevent late responses from another login from repopulating private caches. Revalidation detects a changed user/role and removes resource caches.

Protected routes and role-aware navigation complement the existing server checks. Form fields map validation details to accessible errors, writes wait for server confirmation, and failed writes are not retried automatically. Plain-text announcements use React escaping; link protocols remain validated by the API. Production hardening and deployment are not claimed by local browser verification.
