/** Project only relational identifiers needed to reconcile recruitment references. */
export function reconciliationMysqlRepository(pool) {
  return {
    async drives() {
      const [rows] = await pool.execute(
        'SELECT id, status FROM placement_drives ORDER BY id',
      );
      return rows;
    },
    async lockReference(tx, id) {
      // REPEATABLE READ also locks the missing primary-key gap until commit.
      const [rows] = await tx.execute(
        'SELECT id FROM placement_drives WHERE id = ? FOR UPDATE',
        [id],
      );
      return rows.length > 0;
    },
  };
}
