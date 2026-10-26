# Phase 1 dependency choices

Current stable packages are selected for the approved stack and locked for reproducibility. Application packages support routing, querying, HTTP, the Express API, validation, headers, CORS, rate limits, and redacted logging. Tooling packages support compilation, linting, formatting, parallel development, and meaningful tests. No database drivers, auth libraries, UI component library, or AI libraries are installed before they are needed.

ESLint 10 uses `@typescript-eslint/parser` for JSX reference tracking; this is tooling only. All application source remains JavaScript, with no TypeScript application build or configuration. React Hooks and refresh rules remain enabled. Incompatible legacy React lint plugins and deprecated ESLint 9 were removed rather than forcing peer dependencies.

Direct dependency license metadata from the installed lockfile:

| Package                       | License             |
| ----------------------------- | ------------------- |
| `@eslint/js`                  | MIT                 |
| `@playwright/test`            | Apache-2.0          |
| `@tailwindcss/vite`           | MIT                 |
| `@tanstack/react-query`       | MIT                 |
| `@testing-library/jest-dom`   | MIT                 |
| `@testing-library/react`      | MIT                 |
| `@typescript-eslint/parser`   | MIT                 |
| `@vitejs/plugin-react`        | see package license |
| `axios`                       | MIT                 |
| `concurrently`                | MIT                 |
| `cors`                        | MIT                 |
| `eslint`                      | MIT                 |
| `eslint-plugin-react-hooks`   | MIT                 |
| `eslint-plugin-react-refresh` | MIT                 |
| `express`                     | MIT                 |
| `express-rate-limit`          | MIT                 |
| `globals`                     | MIT                 |
| `helmet`                      | MIT                 |
| `jsdom`                       | MIT                 |
| `msw`                         | MIT                 |
| `pino`                        | MIT                 |
| `prettier`                    | MIT                 |
| `react`                       | MIT                 |
| `react-dom`                   | MIT                 |
| `react-router-dom`            | MIT                 |
| `supertest`                   | MIT                 |
| `tailwindcss`                 | MIT                 |
| `vite`                        | MIT                 |
| `vitest`                      | MIT                 |
| `zod`                         | MIT                 |

## Phase 2 additions

`mysql2` 3.24.6 (MIT) supplies the approved promise-based SQL client; `mongoose` 9.11.2 (MIT) supplies models, validation and version-aware saves for MongoDB. Both were selected from current stable registry versions and locked. No ORM, password library, session library, additional validation library or test-database emulator was added. Local test service startup uses Node built-ins and the existing Docker CLI.

## Phase 3 authentication dependencies

Argon2 implements the approved Argon2id choice; express-session and express-mysql-session provide server-side persistent sessions. npm overrides the session store's older mysql2 transitive pin to the patched compatible 3.24.6 line, because the initial audit found vulnerable mysql2 versions. The actual session store integration suite is rerun against that override. No CSRF package is required for the small session-bound HMAC mechanism using Node crypto.

## Frontend visual redesign

Motion 14.6.0 (MIT) is installed only in the frontend workspace for the requested interface animations. Its declared peer dependencies support React 18/19. Lightweight `m` components and the DOM animation feature set avoid adding drag/gesture features the portal does not use. The package and its transitive dependencies are recorded in the root lockfile. `npm audit` after installation reported zero vulnerabilities. See [UI design](ui-design.md) for styling, branding and reduced-motion behavior.
