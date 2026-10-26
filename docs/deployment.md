# Production deployment preparation

This is an operator runbook for the existing stack: React/Vite static assets, Node 24/Express API, MySQL 8.4 and MongoDB 8. Deployment is not performed by development, test or demo commands. No production database is included in the repository.

## Topology and supplied configuration

Serve the SPA and `/api` under one HTTPS origin. Nginx terminates TLS and proxies API calls to the private Node listener. MySQL and MongoDB stay on private interfaces and require scoped credentials. This same-origin arrangement preserves HTTP-only `SameSite=Lax` session cookies and existing CSRF protections.

`deploy/nginx.conf` is an HTTP-context virtual-host configuration with SPA fallback, immutable hashed assets, HTTPS redirect and security headers. It assumes the verified build is at `/srv/placement/frontend/dist`, the API port is 3000, and the operator's TLS certificate/key are at `/etc/placement/tls/fullchain.pem` and `/etc/placement/tls/privkey.pem`. Set the real hostname in `server_name` when installing it. Keep all other virtual hosts consistent with that routing.

`deploy/placement-api.service` runs the API as the unprivileged `placement` user from `/srv/placement/backend`, loads `/etc/placement/backend.env`, restarts on failure and invokes the application's graceful shutdown handler. It assumes Node 24 is installed at `/usr/bin/node`; update that path to the actual trusted installation when required. The service has a read-only filesystem and no home-directory access.

The API currently binds `0.0.0.0`, so the host firewall **must** restrict port 3000 to the local Nginx proxy. Ports 3306 and 27017 must be reachable only by the application and authorized database operators. Never expose the unauthenticated disposable test Mongo container or its published ports.

## Release procedure

1. Check out the reviewed release commit on a build host with Node 24 and npm 11. Run `npm ci`, the full verification commands in [setup-guide.md](setup-guide.md), and `npm run build`. Use `VITE_API_BASE_URL=/api` and the chosen `VITE_INSTITUTION_TIMEZONE` at build time. Frontend environment variables are public; do not put secrets in them. Keep the matching backend source, root lockfile, database migrations and compiled `frontend/dist` together as a release.
2. Provision private MySQL and MongoDB instances. Create the production MySQL schema and Mongo database explicitly. Enable authentication, durable storage and backups. Use separate schema-owner accounts for migrations/validator setup and scoped runtime accounts. MySQL runtime permissions are SELECT, INSERT, UPDATE and DELETE on the application schema only; Mongo runtime permissions must support CRUD/aggregation on the two application collections. The runtime must not create indexes or validators.
3. Supply a mode-0600 operator environment file outside the checkout. Set `NODE_ENV=production`, `PORT=3000`, `CLIENT_ORIGIN=https://your-actual-hostname`, the five `MYSQL_*` fields, `MONGODB_URI`, and independent high-entropy `SESSION_SECRET` and `CSRF_SECRET` values of at least 32 characters. Configure `SESSION_MAX_AGE_MS` and `AUTH_RATE_LIMIT` for the institution. Set `TRUST_PROXY_HOPS=1` **only** for this one trusted Nginx hop, with direct backend access blocked. A different proxy topology requires its own trust analysis; never blindly trust arbitrary forwarded headers.
4. With schema-owner bindings and the exact release source, execute `backend/scripts/migrate.js` and `backend/scripts/mongoSetup.js` using Node's `--env-file` option. Verify migration success, rerun safety and `backend/scripts/checkDatabases.js`. Do **not** run reference seeds, demo provisioning, test setup or test suites on production. Provision required institution branch records through your reviewed database administration process; the fictional development seed is intentionally refused in production. Provision the first administrator with `backend/scripts/createAdmin.js`, using private `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD` bindings; clear those account-provisioning bindings afterward.
5. Install the release in `/srv/placement`; install locked runtime dependencies from the repository root with `npm ci --omit=dev`. The frontend build must already exist from step 1. Ensure `placement` can read the application and its environment, but cannot edit the release. Install the service unit and Nginx configuration, and supply the valid TLS certificate/key. Run `systemd-analyze verify deploy/placement-api.service` (adapt the path to the installed unit) and `nginx -t` on the target before activating either configuration.
6. Start the API and reload Nginx during the approved deployment window. Verify HTTPS certificate validity, `/api/health`, and an authenticated account request. Health is liveness only; separately verify both databases. Check that the session cookie is `Secure`, `HttpOnly` and `SameSite=Lax`, CSRF-less writes fail, and student report access returns `403`. Exercise SPA deep links, including `/login` and `/admin/reports`, and download a CSV as an administrator.
7. Review structured logs without credentials or student PII. Record the release commit, migration version and verification result. Run read-only reconciliation after release and on a scheduled operator cadence. Keep any confirmed repair audit output according to the institution's retention policy.

## Pre-deploy checklist

- Reviewed branch is clean; clean install, lint, JavaScript syntax validation, build and all dedicated test suites pass.
- Latest backup and restore procedure were verified in an isolated environment. Database ownership, retention and access are documented.
- Both databases have the exact required migrations, validators and indexes; the API uses least-privileged runtime credentials.
- TLS is valid, the actual origin allowlist matches the public hostname, and proxy headers can come only from trusted infrastructure.
- Port 3000 and both database ports are private; no demo/test credentials or sample data are in production.
- Session/CSRF secrets are unique, private and independent. ADMIN provisioning variables have been removed after use.
- `nginx -t` and systemd unit validation pass on the actual target; React deep links and cookie/auth flows work over HTTPS.
- Backups, free disk capacity, service restart policy, liveness monitoring, protected logs and reconciliation ownership are ready.
- Real deployment smoke tests and an operator-approved rollback window are scheduled. Local test evidence does not establish production readiness by itself.

## Rollback and operational limits

Keep the previous immutable application release available. A rollback may point the service/static asset root back to that release only when its code remains compatible with the installed database schema. Never reverse migrations, delete historical records or restore over a live database without a separately reviewed recovery procedure. This final feature release introduces no database migration.

MySQL and MongoDB have no shared transaction. Reconciliation identifies orphan recruitment documents and published drives lacking usable recruitment data; see [the reconciliation runbook](architecture/reconciliation.md). Reports retain SQL aggregates during a Mongo outage and surface a warning. At cold startup the API requires both databases. Do not treat the health endpoint as readiness for either database.

The production host, DNS, trusted TLS certificate, firewall, backups and institution data are operator-owned. This repository prepares configuration and procedures; it does not provision or deploy those resources.
