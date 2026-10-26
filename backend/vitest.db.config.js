import { defineConfig } from 'vitest/config';
export default defineConfig({
  envDir: false,
  test: {
    include: ['../tests/db/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 30000,
    testTimeout: 15000,
  },
});
