import { createHash } from 'node:crypto';

export function demoRepository(pool) {
  return {
    async withProvisioningLock(work) {
      const connection = await pool.getConnection();
      let acquired = false;
      let name;
      try {
        const [[database]] = await connection.query(
          'SELECT DATABASE() AS name',
        );
        name =
          'demo:' +
          createHash('sha256').update(database.name).digest('hex').slice(0, 40);
        const [[lock]] = await connection.execute(
          'SELECT GET_LOCK(?, 15) AS acquired',
          [name],
        );
        if (lock.acquired !== 1)
          throw new Error('Demo provisioning is already running');
        acquired = true;
        return await work();
      } finally {
        try {
          if (acquired)
            await connection.execute('SELECT RELEASE_LOCK(?)', [name]);
        } finally {
          connection.release();
        }
      }
    },
  };
}
