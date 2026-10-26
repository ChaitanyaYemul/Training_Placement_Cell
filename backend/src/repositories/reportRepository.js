import { reportCohort, reportQueries, reportOrder } from './reportQueries.js';
import { rowDto } from './resourceRepository.js';

/** Parameterized aggregate reports read a shared MySQL transaction snapshot. */
export function reportRepository() {
  return {
    async overview(tx, query) {
      const cohort = reportCohort(query);
      const [[row]] = await tx.execute(
        `${cohort.sql}
        SELECT (SELECT COUNT(d.driveId) FROM cohort AS d) AS drives,
          (SELECT COUNT(DISTINCT d.companyId) FROM cohort AS d) AS companies,
          (SELECT COUNT(s.id) FROM scoped_students AS s) AS students,
          COUNT(a.id) AS applications, COUNT(DISTINCT a.studentId) AS participants,
          COALESCE(SUM(a.status = 'selected'), 0) AS selections,
          COUNT(DISTINCT CASE WHEN a.status = 'selected' THEN a.studentId END) AS placedStudents
        FROM applications AS a`,
        cohort.values,
      );
      return row;
    },
    async driveIds(tx, query) {
      const cohort = reportCohort(query);
      const [rows] = await tx.execute(
        `${cohort.sql} SELECT d.driveId FROM cohort AS d ORDER BY d.driveId`,
        cohort.values,
      );
      return rows.map((row) => row.driveId);
    },
    async table(
      tx,
      name,
      query,
      { limit = query.limit, offset = (query.page - 1) * query.limit } = {},
    ) {
      const cohort = reportCohort(query);
      const values = [...cohort.values];
      if (name === 'branches')
        values.push(query.branchId || null, query.branchId || null);
      const sql = reportQueries[name];
      if (!sql) throw new Error('Unknown report');
      const [[count]] = await tx.execute(
        `${cohort.sql} SELECT COUNT(*) AS total FROM (${sql}) AS report`,
        values,
      );
      const [rows] = await tx.query(
        `${cohort.sql} ${sql} ORDER BY ${reportOrder[name]} ${query.sort === '-id' ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?`,
        [...values, limit, offset],
      );
      return { rows: rows.map(rowDto), total: count.total };
    },
  };
}
