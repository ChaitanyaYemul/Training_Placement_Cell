# Local setup — Phase 1

Follow the [root README](../README.md) for version requirements, `npm ci`, workspace environment files, and `npm run dev`. No database server, database credential, session secret, or seed is required for this phase.

Run all commands from the repository root unless a workspace is specified. `npm run dev -w backend` runs Node's watcher from `backend`; `npm run dev -w frontend` runs Vite from `frontend`. Root `npm run dev` runs both. Stop with Ctrl+C. After changing ports or environment files, restart both servers and check `/api/health` on both ports.

Use `npm run check` for lint, formatting, tests, and build, followed by `npm audit`. Install Chromium with `npx playwright install chromium` and use `npm run test:e2e` for live browser verification. Neither backend tests nor E2E tests contact a database.

Troubleshooting: if ports are occupied, stop your own previous dev process or adjust `PORT`, `API_PROXY_TARGET`, and `CLIENT_ORIGIN` consistently. If npm's default cache is unwritable in a cloud sandbox, prefix npm commands with `NPM_CONFIG_CACHE=/tmp/placement-npm-cache`; this does not disable artifact verification. Browser installation can require OS libraries on minimal Linux images. In this cloud instance the download domain is blocked, but `/usr/bin/chromium` is preinstalled; use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.

There are no demo accounts, migrations, database test commands, or database connectivity claims yet. The reserved database/admin scripts fail explicitly. Future database tests must use dedicated names ending in `_test` and never development/production data.
