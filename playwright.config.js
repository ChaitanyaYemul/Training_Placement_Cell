import { defineConfig } from '@playwright/test';
// E2E runs exclusively on the explicitly configured disposable test databases.
process.loadEnvFile('backend/.env.test');
process.env.CLIENT_ORIGIN = 'http://127.0.0.1:5173,http://localhost:5173';
process.env.AUTH_RATE_LIMIT = '100';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  globalSetup: './tests/e2e/globalSetup.js',
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
      'npx concurrently --kill-others "node --env-file=backend/.env.test backend/src/server.js" "npm run dev -w frontend"',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
