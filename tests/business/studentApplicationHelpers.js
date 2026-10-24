import { beforeEach, expect } from 'vitest';
import {
  pool,
  student,
  admin,
  write,
  createDrive,
  publish,
} from './helpers.js';
import { applicationRepository } from '../../backend/src/repositories/applicationRepository.js';
import { studentRepository } from '../../backend/src/repositories/studentRepository.js';
import { driveRepository } from '../../backend/src/repositories/driveRepository.js';
export {
  pool,
  student,
  admin,
  other,
  app,
  write,
  createDrive,
  publish,
  driveBody,
} from './helpers.js';
beforeEach(async () => {
  await pool.execute(
    "UPDATE students SET full_name='Example Student', enrollment_number='APP-001', branch_id=1, graduation_year=2030 WHERE id=?",
    [student.user.studentId],
  );
  await pool.execute('DELETE FROM academic_records WHERE student_id=?', [
    student.user.studentId,
  ]);
  await pool.execute(
    'INSERT INTO academic_records (student_id,semester,sgpa,cgpa,active_backlogs) VALUES (?,1,8,8,0)',
    [student.user.studentId],
  );
});
export function repositories() {
  return {
    pool,
    applications: applicationRepository(pool),
    students: studentRepository(pool),
    drives: driveRepository(pool),
  };
}
export async function openDrive(body) {
  return publish(await createDrive(body));
}
export async function apply(drive) {
  const response = await write(
    student,
    'post',
    `/placement-drives/${drive.id}/applications`,
    {},
  );
  expect(response.status).toBe(201);
  return response.body.data;
}
export async function stored(driveId) {
  const [[row]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM student_applications WHERE drive_id=? AND student_id=?',
    [driveId, student.user.studentId],
  );
  return row.total;
}
export async function advance(application, status) {
  const result = await write(
    admin,
    'patch',
    `/admin/applications/${application.id}/status`,
    { status, remarks: 'Example official decision' },
  );
  expect(result.status).toBe(200);
}
