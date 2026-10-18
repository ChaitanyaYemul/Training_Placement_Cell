import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['../tests/outage/**/*.test.js'],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 30000,
    testTimeout: 45000,
  },
});
