/** Run MySQL work atomically and always return its connection to the pool. */
export async function withTransaction(pool, work, { isolationLevel } = {}) {
  if (isolationLevel && isolationLevel !== 'REPEATABLE READ')
    throw new Error('Unsupported transaction isolation level');
  const connection = await pool.getConnection();
  try {
    if (isolationLevel === 'REPEATABLE READ')
      await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
