import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
const migrationDirectory = new URL(
  '../../../database/mysql/migrations/',
  import.meta.url,
);
export async function readMigrations(directory = migrationDirectory) {
  const names = (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  if (new Set(names.map((name) => name.slice(0, 4))).size !== names.length)
    throw new Error('Duplicate migration version');
  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(new URL(name, directory), 'utf8');
      return {
        name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );
}
export async function migrateMysql(pool, migrations) {
  const connection = await pool.getConnection();
  let lockName;
  let locked = false;
  try {
    const [[database]] = await connection.query(
      'SELECT DATABASE() AS name, VERSION() AS version',
    );
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(database.version);
    if (
      !match ||
      /mariadb/i.test(database.version) ||
      Number(match[1]) < 8 ||
      (Number(match[1]) === 8 &&
        Number(match[2]) === 0 &&
        Number(match[3]) < 16)
    )
      throw new Error(
        'MySQL 8.0.16 or newer is required; MariaDB is not the selected engine',
      );
    lockName =
      'placement:' +
      createHash('sha256').update(database.name).digest('hex').slice(0, 40);
    const [[lock]] = await connection.execute(
      'SELECT GET_LOCK(?, 15) AS acquired',
      [lockName],
    );
    if (lock.acquired !== 1)
      throw new Error('Could not acquire migration lock');
    locked = true;
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY, checksum CHAR(64) NOT NULL,
      state ENUM('started','applied') NOT NULL, applied_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [existing] = await connection.query(
      'SELECT name, checksum, state FROM schema_migrations ORDER BY name',
    );
    const known = new Map(
      migrations.map((migration) => [migration.name, migration]),
    );
    for (const applied of existing) {
      if (applied.state !== 'applied')
        throw new Error(
          `Incomplete DDL migration ${applied.name}; inspect and repair explicitly before continuing`,
        );
      if (known.get(applied.name)?.checksum !== applied.checksum)
        throw new Error(
          `Migration checksum mismatch or missing file: ${applied.name}`,
        );
    }
    const appliedNames = new Set(existing.map((entry) => entry.name));
    const pending = migrations.filter(
      (migration) => !appliedNames.has(migration.name),
    );
    if (
      pending.some((migration) =>
        existing.some((applied) => applied.name > migration.name),
      )
    )
      throw new Error('Out-of-order migration; append new versions only');
    for (const migration of pending) {
      await connection.execute(
        'INSERT INTO schema_migrations (name, checksum, state) VALUES (?, ?, ?)',
        [migration.name, migration.checksum, 'started'],
      );
      // One trusted statement per immutable file; multipleStatements remains disabled.
      await connection.query(migration.sql);
      await connection.execute(
        "UPDATE schema_migrations SET state = 'applied', applied_at = UTC_TIMESTAMP() WHERE name = ?",
        [migration.name],
      );
    }
    return pending.map((migration) => migration.name);
  } finally {
    try {
      if (locked)
        await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
    } finally {
      connection.release();
    }
  }
}
