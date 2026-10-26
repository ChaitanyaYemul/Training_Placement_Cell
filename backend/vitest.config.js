import { defineConfig } from 'vitest/config';
export default defineConfig({
  // Tests must never read development credentials; DB suites load .env.test explicitly.
  envDir: false,
  test: { include: ['../tests/backend/**/*.test.js'], environment: 'node' },
});
