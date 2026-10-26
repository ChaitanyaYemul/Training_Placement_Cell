import { withTransaction } from '../repositories/transaction.js';

/** Compare database-owned records without fabricating recruitment content. */
export function reconciliationService({ pool, drives, recruitment }) {
  return {
    async scan() {
      const [masters, processes] = await Promise.all([
        drives.drives(),
        recruitment.processes(),
      ]);
      const masterIds = new Set(masters.map(({ id }) => id));
      const processByDrive = new Map(
        processes.map((process) => [process.placementDriveId, process]),
      );
      const orphans = processes.filter(
        ({ placementDriveId }) => !masterIds.has(placementDriveId),
      );
      const published = masters.filter(({ status }) => status === 'published');
      const missing = published
        .filter(({ id }) => !processByDrive.has(id))
        .map(({ id }) => ({ placementDriveId: id }));
      const empty = published
        .filter(({ id }) => processByDrive.get(id)?.roundCount === 0)
        .map(({ id }) => ({ placementDriveId: id }));
      return {
        counts: {
          drives: masters.length,
          processes: processes.length,
          orphans: orphans.length,
          missing: missing.length,
          empty: empty.length,
        },
        orphans,
        missing,
        empty,
      };
    },
    async fix(orphans, { confirmed = false, audit } = {}) {
      if (!confirmed || typeof audit !== 'function')
        throw new Error(
          'Orphan cleanup requires confirmation and an audit writer',
        );
      const results = [];
      for (const snapshot of orphans) {
        const { placementDriveId, documentId, version, updatedAt } = snapshot;
        const metadata = { placementDriveId, documentId, version, updatedAt };
        const status = await withTransaction(
          pool,
          async (tx) => {
            if (await drives.lockReference(tx, placementDriveId)) {
              await audit({
                event: 'orphan_cleanup_skipped',
                ...metadata,
                status: 'referenced',
              });
              return 'referenced';
            }
            // The audit must be durable before any Mongo write. Mongo cannot roll back with MySQL.
            await audit({ event: 'orphan_delete_intent', ...metadata });
            const removed = await recruitment.removeUnchanged(snapshot);
            const status = removed ? 'removed' : 'changed_or_absent';
            await audit({ event: 'orphan_delete_result', ...metadata, status });
            return status;
          },
          { isolationLevel: 'REPEATABLE READ' },
        );
        results.push({ placementDriveId, documentId, status });
      }
      return results;
    },
  };
}
