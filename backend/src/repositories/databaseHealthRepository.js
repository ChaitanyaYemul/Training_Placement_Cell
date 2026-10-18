export async function checkMysql(pool) {
  const [[row]] = await pool.query(
    'SELECT VERSION() AS version, DATABASE() AS databaseName, @@session.time_zone AS timezone',
  );
  return row;
}
export async function checkMongo(connection) {
  await connection.db.command({ ping: 1 });
  const result = await connection.db.admin().command({ buildInfo: 1 });
  return { version: result.version, databaseName: connection.name };
}
