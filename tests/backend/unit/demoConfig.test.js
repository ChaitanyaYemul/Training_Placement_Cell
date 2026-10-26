import { describe, expect, it } from 'vitest';
import { assertDemoSettings } from '../../../backend/src/config/demoConfig.js';

describe('isolated demo provisioning settings', () => {
  it('refuses production and test environments before provisioning', () => {
    for (const mode of ['production', 'test'])
      expect(() =>
        assertDemoSettings(mode, 'placement_demo', 'placement_demo'),
      ).toThrow('NODE_ENV=development');
  });
  it('refuses development, test, missing and mismatched database targets', () => {
    for (const names of [
      ['placement', 'placement'],
      ['placement_test', 'placement_test'],
      ['placement_demo', 'other_demo'],
      [undefined, undefined],
    ])
      expect(() => assertDemoSettings('development', ...names)).toThrow(
        'matching names ending in _demo',
      );
  });
  it('accepts an explicit isolated pair of demo databases', () => {
    expect(
      assertDemoSettings('development', 'placement_demo', 'placement_demo'),
    ).toEqual({
      mysqlDatabase: 'placement_demo',
      mongoDatabase: 'placement_demo',
    });
  });
});
