import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['../tests/business/**/*.test.js'],
    fileParallelism: false,
    maxWorkers: 1,
    environment: 'node',
    hookTimeout: 30000,
    testTimeout: 15000,
  },
});
