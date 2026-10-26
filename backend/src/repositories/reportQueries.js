// Reporting cohorts use the registration deadline, not application/history dates.
// Only constant SQL fragments are interpolated; every filter value is bound.
export function reportCohort(query) {
  const clauses = [],
    values = [];
  for (const [key, column] of [
    ['driveId', 'd.id'],
    ['companyId', 'j.company_id'],
  ]) {
    if (query[key]) {
      clauses.push(`${column} = ?`);
      values.push(query[key]);
    }
  }
  if (query.from) {
    clauses.push('d.registration_deadline >= ?');
    values.push(query.from);
  }
  if (query.to) {
    clauses.push('d.registration_deadline < DATE_ADD(?, INTERVAL 1 DAY)');
    values.push(query.to);
  }
  if (query.branchId) {
    clauses.push(
      'EXISTS (SELECT 1 FROM drive_eligible_branches AS eb WHERE eb.drive_id = d.id AND eb.branch_id = ?)',
    );
    values.push(query.branchId);
  }
  const studentWhere = query.branchId ? 'WHERE s.branch_id = ?' : '';
  if (query.branchId) values.push(query.branchId);
  return {
    sql: `WITH cohort AS (
      SELECT d.id AS driveId, d.title, d.status, d.registration_deadline AS registrationDeadline,
        d.min_cgpa AS minCgpa, d.max_active_backlogs AS maxActiveBacklogs,
        d.eligible_graduation_year AS eligibleGraduationYear,
        j.company_id AS companyId, c.name AS companyName
      FROM placement_drives AS d
      JOIN job_postings AS j ON j.id = d.job_posting_id
      JOIN companies AS c ON c.id = j.company_id
      ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
    ), scoped_students AS (
      SELECT s.id, s.branch_id AS branchId FROM students AS s ${studentWhere}
    ), applications AS (
      SELECT a.id, a.drive_id AS driveId, a.student_id AS studentId, a.status, s.branchId
      FROM student_applications AS a
      JOIN cohort AS d ON d.driveId = a.drive_id
      JOIN scoped_students AS s ON s.id = a.student_id
    )`,
    values,
  };
}

const activity = `COUNT(a.id) AS applications,
  COUNT(DISTINCT a.studentId) AS participants,
  COALESCE(SUM(a.status = 'selected'), 0) AS selections,
  COUNT(DISTINCT CASE WHEN a.status = 'selected' THEN a.studentId END) AS placedStudents`;

// Each aggregate starts with its dimension, preserving zero-application rows.
export const reportQueries = {
  drives: `SELECT d.driveId, d.title, d.status, d.companyId, d.companyName,
    d.registrationDeadline, ${activity}
    FROM cohort AS d LEFT JOIN applications AS a ON a.driveId = d.driveId
    GROUP BY d.driveId, d.title, d.status, d.companyId, d.companyName, d.registrationDeadline`,
  companies: `SELECT d.companyId, d.companyName, COUNT(DISTINCT d.driveId) AS drives, ${activity}
    FROM cohort AS d LEFT JOIN applications AS a ON a.driveId = d.driveId
    GROUP BY d.companyId, d.companyName`,
  branches: `SELECT b.id AS branchId, b.code, b.name,
    (SELECT COUNT(s.id) FROM scoped_students AS s WHERE s.branchId = b.id) AS students,
    (SELECT COUNT(d.driveId) FROM cohort AS d JOIN drive_eligible_branches AS eb ON eb.drive_id = d.driveId WHERE eb.branch_id = b.id) AS drives,
    ${activity}
    FROM branches AS b LEFT JOIN applications AS a ON a.branchId = b.id
    WHERE (? IS NULL OR b.id = ?)
    GROUP BY b.id, b.code, b.name`,
  statuses: `SELECT v.status, COUNT(a.id) AS count FROM (
      SELECT 'applied' AS status, 1 AS position UNION ALL SELECT 'shortlisted', 2
      UNION ALL SELECT 'selected', 3 UNION ALL SELECT 'rejected', 4 UNION ALL SELECT 'withdrawn', 5
    ) AS v LEFT JOIN applications AS a ON a.status = v.status GROUP BY v.status, v.position`,
  participation: `SELECT d.driveId, d.title, d.minCgpa, d.maxActiveBacklogs, d.eligibleGraduationYear,
    COUNT(DISTINCT a.studentId) AS participants
    FROM cohort AS d LEFT JOIN applications AS a ON a.driveId = d.driveId
    GROUP BY d.driveId, d.title, d.minCgpa, d.maxActiveBacklogs, d.eligibleGraduationYear`,
};

export const reportOrder = {
  drives: 'driveId',
  companies: 'companyId',
  branches: 'branchId',
  statuses:
    "FIELD(v.status, 'applied', 'shortlisted', 'selected', 'rejected', 'withdrawn')",
  participation: 'driveId',
};
