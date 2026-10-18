import { rowDto } from './resourceRepository.js';
const columns = {
  fullName: 'full_name',
  enrollmentNumber: 'enrollment_number',
  phone: 'phone',
  branchId: 'branch_id',
  graduationYear: 'graduation_year',
};
export function studentRepository(pool) {
  return {
    async profile(studentId) {
      const [[row]] = await pool.execute(
        'SELECT id, user_id AS userId, full_name AS fullName, enrollment_number AS enrollmentNumber, phone, branch_id AS branchId, graduation_year AS graduationYear FROM students WHERE id = ?',
        [studentId],
      );
      return rowDto(row);
    },
    async patch(studentId, body) {
      const pairs = Object.entries(body).filter(([key]) => columns[key]);
      if (pairs.length)
        await pool.execute(
          `UPDATE students SET ${pairs.map(([key]) => columns[key] + ' = ?').join(', ')} WHERE id = ?`,
          [...pairs.map(([, value]) => value), studentId],
        );
    },
    async records(studentId) {
      const [rows] = await pool.execute(
        'SELECT id, semester, sgpa, cgpa, active_backlogs AS activeBacklogs FROM academic_records WHERE student_id = ? ORDER BY semester',
        [studentId],
      );
      return rows;
    },
    async replaceRecords(tx, studentId, records) {
      await tx.execute('SELECT id FROM students WHERE id = ? FOR UPDATE', [
        studentId,
      ]);
      await tx.execute('DELETE FROM academic_records WHERE student_id = ?', [
        studentId,
      ]);
      for (const record of records)
        await tx.execute(
          'INSERT INTO academic_records (student_id, semester, sgpa, cgpa, active_backlogs) VALUES (?, ?, ?, ?, ?)',
          [
            studentId,
            record.semester,
            record.sgpa,
            record.cgpa,
            record.activeBacklogs,
          ],
        );
    },
    async branches() {
      const [rows] = await pool.query(
        'SELECT id, code, name FROM branches ORDER BY code',
      );
      return rows;
    },
    async summary(studentId) {
      const [[row]] = await pool.execute(
        'SELECT student_id AS studentId, branch_id AS branchId, graduation_year AS graduationYear, cgpa, active_backlogs AS activeBacklogs FROM v_student_academic_summary WHERE student_id = ?',
        [studentId],
      );
      return row;
    },
  };
}
