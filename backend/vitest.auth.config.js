import { defineConfig } from 'vitest/config';
export default defineConfig({
  envDir: false,
  test: {
    include: ['../tests/auth/**/*.test.js'],
    fileParallelism: false,
    maxWorkers: 1,
    environment: 'node',
    hookTimeout: 30000,
    testTimeout: 15000,
  },
});
