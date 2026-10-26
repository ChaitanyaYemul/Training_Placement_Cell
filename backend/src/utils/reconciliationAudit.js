import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { validateWindowsAuditPermissions } from './windowsAuditPermissions.js';

/** Append and fsync a private audit file; refuse symlinks and non-regular files. */
export async function openReconciliationAudit(path) {
  let handle;
  let created = false;
  if (process.platform === 'win32') {
    try {
      handle = await open(path, 'ax', 0o600);
      created = true;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const entry = await lstat(path);
      if (!entry.isFile() || entry.isSymbolicLink())
        throw new Error(
          'Reconciliation audit requires a private regular file',
          {
            cause: error,
          },
        );
      handle = await open(path, 'a');
    }
  } else {
    handle = await open(
      path,
      constants.O_WRONLY |
        constants.O_APPEND |
        constants.O_CREAT |
        constants.O_NOFOLLOW,
      0o600,
    );
  }
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1)
      throw new Error('Reconciliation audit requires a private regular file');
    if (process.platform === 'win32') {
      await validateWindowsAuditPermissions(path, { created });
      const entry = await lstat(path);
      if (!entry.isFile() || entry.isSymbolicLink() || entry.ino !== stat.ino)
        throw new Error('Reconciliation audit requires a private regular file');
    } else if ((stat.mode & 0o077) !== 0) {
      throw new Error('Reconciliation audit requires a private regular file');
    }
  } catch (error) {
    await handle.close();
    throw error;
  }
  const runId = randomUUID();
  return {
    async write(event) {
      await handle.appendFile(
        JSON.stringify({ ...event, runId, at: new Date().toISOString() }) +
          '\n',
      );
      await handle.sync();
    },
    close: () => handle.close(),
  };
}
