import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
// E2E runs exclusively on the explicitly configured disposable test databases.
process.loadEnvFile('backend/.env.test');
// Allocate new schemas per run; preserve existing databases without DROP/reset.
process.env.PLACEMENT_E2E_RUN ??= randomBytes(8).toString('hex');
process.env.MYSQL_DATABASE = `placement_e2e_${process.env.PLACEMENT_E2E_RUN}_test`;
const mongoUri = new URL(process.env.MONGODB_URI);
mongoUri.pathname = '/' + process.env.MYSQL_DATABASE;
process.env.MONGODB_URI = mongoUri.toString();
process.env.CLIENT_ORIGIN = 'http://127.0.0.1:5173,http://localhost:5173';
process.env.AUTH_RATE_LIMIT = '100';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command:
      'node --env-file=backend/.env.test tests/e2e/prepare.js && npx concurrently --kill-others "node --env-file=backend/.env.test backend/src/server.js" "npm run dev -w frontend"',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
