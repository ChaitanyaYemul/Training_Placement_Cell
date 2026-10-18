import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import {
  assertTestDatabase,
  mongoDatabaseName,
} from '../../../backend/src/config/databaseEnv.js';
import { safeFlexible } from '../../../backend/src/models/mongodb/schemaHelpers.js';
describe('Database safety guards', () => {
  it('requires a dedicated explicit test database before destructive operations', () => {
    for (const name of [
      '',
      undefined,
      'placement_dev',
      'placement_production',
      'placement_test.extra',
      'placement_test;',
    ])
      expect(() => assertTestDatabase(name)).toThrow();
    expect(() => assertTestDatabase('placement_test')).not.toThrow();
  });
  it('extracts explicit Mongo database names without disclosing URIs', () => {
    expect(
      mongoDatabaseName(
        'mongodb://127.0.0.1:27017/placement_test?retryWrites=false',
      ),
    ).toBe('placement_test');
    expect(() => mongoDatabaseName('mongodb://127.0.0.1:27017')).toThrow(
      'explicit database name',
    );
  });
  it('bounds flexible document data and rejects dangerous nested keys', () => {
    expect(
      safeFlexible({ venue: 'College lab', instructions: ['Bring ID'] }),
    ).toBe(true);
    expect(safeFlexible({ nested: { $gt: 1 } })).toBe(false);
    expect(safeFlexible({ 'a.b': 1 })).toBe(false);
    expect(safeFlexible({ number: Infinity })).toBe(false);
  });
  it('refuses sample seeding in production before any database operation', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { assertDevelopmentSeed } from './src/config/databaseEnv.js'; assertDevelopmentSeed();",
      ],
      {
        cwd: new URL('../../../backend/', import.meta.url),
        env: { NODE_ENV: 'production' },
        encoding: 'utf8',
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Sample seeds are forbidden in production');
  });
});
