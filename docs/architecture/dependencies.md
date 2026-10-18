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
