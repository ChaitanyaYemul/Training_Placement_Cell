import { reportCohort } from './reportQueries.js';

/** Batched facts for the shared eligibility evaluator; never exposes them as student records. */
export function reportEligibilityRepository() {
  return {
    async students(tx, query) {
      const [rows] = await tx.execute(
        `SELECT s.id, s.full_name AS fullName,
        s.enrollment_number AS enrollmentNumber, s.branch_id AS branchId,
        s.graduation_year AS graduationYear, a.cgpa, a.active_backlogs AS activeBacklogs,
        a.semester
        FROM students AS s JOIN users AS u ON u.id = s.user_id AND u.is_active = 1
        LEFT JOIN v_student_academic_summary AS a ON a.student_id = s.id
        WHERE (? IS NULL OR s.branch_id = ?) ORDER BY s.id`,
        [query.branchId || null, query.branchId || null],
      );
      return rows;
    },
    async branches(tx, driveIds) {
      if (!driveIds.length) return [];
      const [rows] = await tx.execute(
        `SELECT eb.drive_id AS driveId, eb.branch_id AS id
        FROM drive_eligible_branches AS eb WHERE eb.drive_id IN (${driveIds.map(() => '?').join(',')})`,
        driveIds,
      );
      return rows;
    },
    async participants(tx, query) {
      const cohort = reportCohort(query);
      const [rows] = await tx.execute(
        `${cohort.sql} SELECT a.driveId, a.studentId FROM applications AS a`,
        cohort.values,
      );
      return rows;
    },
  };
}
