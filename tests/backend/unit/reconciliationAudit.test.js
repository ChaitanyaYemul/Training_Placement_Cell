import { chmod, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { openReconciliationAudit } from '../../../backend/src/utils/reconciliationAudit.js';

const directories = [];
afterEach(async () => {
  for (const path of directories.splice(0)) await rm(path, { recursive: true });
});
const folder = async () => {
  const path = await mkdtemp(join(tmpdir(), 'placement-reconciliation-'));
  directories.push(path);
  return path;
};
describe('Reconciliation operator safeguards', () => {
  it('appends durable metadata events without overwriting the audit trail', async () => {
    const path = join(await folder(), 'audit.jsonl');
    for (const event of ['orphan_delete_intent', 'orphan_delete_result']) {
      const audit = await openReconciliationAudit(path);
      await audit.write({ event, placementDriveId: 7 });
      await audit.close();
    }
    const rows = (await readFile(path, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(rows.map(({ event }) => event)).toEqual([
      'orphan_delete_intent',
      'orphan_delete_result',
    ]);
    expect(rows[0]).toMatchObject({
      placementDriveId: 7,
      runId: expect.any(String),
      at: expect.any(String),
    });
  });
  it('refuses shared files and symlinks as audit destinations', async () => {
    const directory = await folder();
    const path = join(directory, 'audit.jsonl');
    const audit = await openReconciliationAudit(path);
    await audit.close();
    if (process.platform === 'win32') {
      const shared = spawnSync('icacls.exe', [path, '/grant', '*S-1-1-0:(R)'], {
        encoding: 'utf8',
        windowsHide: true,
      });
      expect(shared.status).toBe(0);
    } else {
      await chmod(path, 0o644);
    }
    await expect(openReconciliationAudit(path)).rejects.toThrow('private');
    // Directory junctions exercise Windows reparse-point rejection without admin privileges.
    await symlink(
      process.platform === 'win32' ? directory : path,
      join(directory, 'link'),
      process.platform === 'win32' ? 'junction' : 'file',
    );
    await expect(
      openReconciliationAudit(join(directory, 'link')),
    ).rejects.toThrow();
  });
  it('refuses noninteractive --fix and unknown options before touching databases', () => {
    for (const args of [
      ['--fix', '--audit-file', '/tmp/unused-audit.jsonl'],
      ['--unknown'],
    ]) {
      const result = spawnSync(
        process.execPath,
        ['scripts/reconcile.js', ...args],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('Reconciliation failed');
      expect(result.stdout).not.toContain('reconciliation_scan');
    }
  });
});
