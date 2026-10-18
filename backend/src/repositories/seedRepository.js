import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
export async function seedMysql(pool) {
  const directory = new URL('../../../database/mysql/seed/', import.meta.url);
  const names = (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  const sql = await Promise.all(
    names.map((name) => readFile(new URL(name, directory), 'utf8')),
  );
  const connection = await pool.getConnection();
  let locked = false;
  let lockName;
  try {
    const [[database]] = await connection.query('SELECT DATABASE() AS name');
    lockName =
      'seed:' +
      createHash('sha256').update(database.name).digest('hex').slice(0, 40);
    const [[result]] = await connection.execute(
      'SELECT GET_LOCK(?, 15) AS acquired',
      [lockName],
    );
    if (result.acquired !== 1)
      throw new Error('Could not lock sample seed operation');
    locked = true;
    await connection.beginTransaction();
    for (const statement of sql) await connection.query(statement);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    try {
      if (locked)
        await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
    } finally {
      connection.release();
    }
  }
  return names;
}
export async function seedReferences(pool, driveId, authorId) {
  const [rows] = await pool.execute(
    `SELECT d.id AS driveId, u.id AS authorId
    FROM placement_drives AS d JOIN users AS u ON u.id = ?
    WHERE d.id = ? AND u.role = 'admin' AND u.is_active = 1`,
    [authorId, driveId],
  );
  if (rows.length !== 1)
    throw new Error(
      'Mongo sample seed requires an existing drive and active administrator in MySQL',
    );
  return rows[0];
}
