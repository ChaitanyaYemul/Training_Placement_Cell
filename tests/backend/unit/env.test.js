import { describe, it, expect } from 'vitest';
import { envSchema } from '../../../backend/src/config/env.js';
describe('Phase 1 configuration', () => {
  it('starts without database or authentication credentials', () => {
    expect(envSchema.parse({}).PORT).toBe(3000);
  });
  it('rejects an invalid port', () => {
    expect(envSchema.safeParse({ PORT: 'invalid' }).success).toBe(false);
  });
  it('rejects wildcard CORS and origins with paths', () => {
    expect(envSchema.safeParse({ CLIENT_ORIGIN: '*' }).success).toBe(false);
    expect(
      envSchema.safeParse({ CLIENT_ORIGIN: 'http://localhost:5173/path' })
        .success,
    ).toBe(false);
  });
});
