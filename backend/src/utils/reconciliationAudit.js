import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

/** Append and fsync a private audit file; refuse symlinks and non-regular files. */
export async function openReconciliationAudit(path) {
  const handle = await open(
    path,
    constants.O_WRONLY |
      constants.O_APPEND |
      constants.O_CREAT |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || (stat.mode & 0o077) !== 0)
      throw new Error('Reconciliation audit requires a private regular file');
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
