import { resourceRepository } from './resourceRepository.js';
export function driveRepository(pool) {
  const core = resourceRepository(pool, 'placement_drives');
  return {
    ...core,
    async listVisible(user, query) {
      const clauses = [],
        values = [];
      if (user.role === 'student')
        clauses.push("r.status IN ('published','completed','cancelled')");
      if (query.status) {
        clauses.push('r.status = ?');
        values.push(query.status);
      }
      if (query.companyId) {
        clauses.push(
          'EXISTS (SELECT 1 FROM job_postings AS j WHERE j.id = r.job_posting_id AND j.company_id = ?)',
        );
        values.push(query.companyId);
      }
      if (query.branchId) {
        clauses.push(
          'EXISTS (SELECT 1 FROM drive_eligible_branches AS eb WHERE eb.drive_id = r.id AND eb.branch_id = ?)',
        );
        values.push(query.branchId);
      }
      return core.list(query, clauses, values);
    },
    async branches(ids, tx = pool) {
      if (!ids.length) return [];
      const [rows] = await tx.execute(
        `SELECT eb.drive_id AS driveId, b.id, b.code, b.name FROM drive_eligible_branches AS eb JOIN branches AS b ON b.id = eb.branch_id WHERE eb.drive_id IN (${ids.map(() => '?').join(',')}) ORDER BY b.id`,
        ids,
      );
      return rows;
    },
    async replaceBranches(tx, driveId, branchIds) {
      await tx.execute(
        'DELETE FROM drive_eligible_branches WHERE drive_id = ?',
        [driveId],
      );
      for (const id of branchIds)
        await tx.execute(
          'INSERT INTO drive_eligible_branches (drive_id, branch_id) VALUES (?, ?)',
          [driveId, id],
        );
    },
    async hasApplications(driveId, tx = pool) {
      const [[row]] = await tx.execute(
        'SELECT COUNT(*) AS total FROM student_applications WHERE drive_id = ?',
        [driveId],
      );
      return row.total > 0;
    },
    async appliedDrives(studentId) {
      const [rows] = await pool.execute(
        'SELECT drive_id AS driveId FROM student_applications WHERE student_id = ?',
        [studentId],
      );
      return rows.map((row) => row.driveId);
    },
    async futureDeadline(tx, deadline) {
      const [[row]] = await tx.execute('SELECT ? > UTC_TIMESTAMP() AS future', [
        deadline.replace('T', ' ').replace('Z', ''),
      ]);
      return Boolean(row.future);
    },
  };
}
