import { it, expect } from 'vitest';
import {
  pool,
  student,
  admin,
  write,
  openDrive,
  apply,
  advance,
  stored,
  repositories,
} from './studentApplicationHelpers.js';
import { studentApplicationService } from '../../backend/src/services/studentApplicationService.js';
import { applicationStatusService } from '../../backend/src/services/applicationStatusService.js';

it('BR-04/09: concurrent submissions commit one application and one initial history event', async () => {
  const drive = await openDrive();
  const results = await Promise.all([
    write(student, 'post', `/placement-drives/${drive.id}/applications`, {}),
    write(student, 'post', `/placement-drives/${drive.id}/applications`, {}),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(results.find((r) => r.status === 409).body.error.code).toBe(
    'DUPLICATE_APPLICATION',
  );
  expect(await stored(drive.id)).toBe(1);
  const id = results.find((r) => r.status === 201).body.data.id;
  const [[row]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM application_status_history WHERE application_id=?',
    [id],
  );
  expect(row.total).toBe(1);
});

it('BR-09: failed initial history insertion rolls back the actual MySQL application', async () => {
  const drive = await openDrive();
  const repo = repositories();
  const service = studentApplicationService({
    ...repo,
    applications: {
      ...repo.applications,
      initialHistory: async () => {
        throw new Error('Controlled history write failure');
      },
    },
  });
  await expect(service.apply(drive.id, student.user)).rejects.toThrow(
    'Controlled history write failure',
  );
  expect(await stored(drive.id)).toBe(0);
  await apply(drive); // Rollback also released locks and preserved the ability to retry explicitly.
});

it('BR-09/16: failed withdrawal history transaction rolls back status and history together', async () => {
  const row = await apply(await openDrive());
  const repo = repositories();
  const service = applicationStatusService(pool, {
    ...repo.applications,
    status: async (...args) => {
      await repo.applications.status(...args);
      throw new Error('Controlled transaction failure');
    },
  });
  await expect(service.withdraw(row.id, student.user)).rejects.toThrow(
    'Controlled transaction failure',
  );
  const saved = await repo.applications.detail(row.id, student.user.studentId);
  expect(saved.status).toBe('applied');
  expect(saved.history.map((h) => h.toStatus)).toEqual(['applied']);
});

it('BR-09/16: concurrent selection and withdrawal record exactly one valid terminal transition', async () => {
  const row = await apply(await openDrive());
  await advance(row, 'shortlisted');
  const results = await Promise.all([
    write(admin, 'patch', `/admin/applications/${row.id}/status`, {
      status: 'selected',
    }),
    write(student, 'patch', `/applications/${row.id}/withdraw`, {}),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  const saved = await repositories().applications.detail(row.id);
  expect(['selected', 'withdrawn']).toContain(saved.status);
  expect(saved.history.map((h) => h.toStatus)).toEqual([
    'applied',
    'shortlisted',
    saved.status,
  ]);
});

it('BR-03: checks the DB deadline again at INSERT after earlier eligibility checks passed', async () => {
  const drive = await openDrive();
  const repo = repositories();
  const service = studentApplicationService({
    ...repo,
    applications: {
      ...repo.applications,
      insertOpen: async (tx, ...args) => {
        await tx.execute(
          'UPDATE placement_drives SET registration_deadline=UTC_TIMESTAMP() WHERE id=?',
          [drive.id],
        );
        return repo.applications.insertOpen(tx, ...args);
      },
    },
  });
  await expect(service.apply(drive.id, student.user)).rejects.toMatchObject({
    code: 'DEADLINE_PASSED',
  });
  expect(await stored(drive.id)).toBe(0);
});

it('BR-05/15: waits for a concurrent academic edit and evaluates the committed latest revision', async () => {
  const drive = await openDrive();
  const repo = repositories();
  const tx = await pool.getConnection();
  let reached;
  const waiting = new Promise((resolve) => {
    reached = resolve;
  });
  await tx.beginTransaction();
  await tx.execute('SELECT id FROM students WHERE id=? FOR UPDATE', [
    student.user.studentId,
  ]);
  const service = studentApplicationService({
    ...repo,
    students: {
      ...repo.students,
      lockApplicationProfile: (...args) => {
        reached();
        return repo.students.lockApplicationProfile(...args);
      },
    },
  });
  const pending = service.apply(drive.id, student.user);
  // Attach the rejection assertion immediately; the barrier below requires no timing assumptions.
  const assertion = expect(pending).rejects.toMatchObject({
    code: 'NOT_ELIGIBLE',
  });
  try {
    await waiting;
    await tx.execute('UPDATE academic_records SET cgpa=0 WHERE student_id=?', [
      student.user.studentId,
    ]);
    await tx.commit();
  } finally {
    await tx.rollback();
    tx.release();
  }
  await assertion;
  expect(await stored(drive.id)).toBe(0);
});

it('BR-03/08: waits for a concurrent drive lifecycle change before accepting an application', async () => {
  const drive = await openDrive();
  const repo = repositories();
  const tx = await pool.getConnection();
  let reached;
  const waiting = new Promise((resolve) => {
    reached = resolve;
  });
  await tx.beginTransaction();
  await tx.execute('SELECT id FROM placement_drives WHERE id=? FOR UPDATE', [
    drive.id,
  ]);
  const service = studentApplicationService({
    ...repo,
    drives: {
      ...repo.drives,
      get: (...args) => {
        reached();
        return repo.drives.get(...args);
      },
    },
  });
  const assertion = expect(
    service.apply(drive.id, student.user),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  try {
    await waiting;
    await tx.execute(
      "UPDATE placement_drives SET status='completed' WHERE id=?",
      [drive.id],
    );
    await tx.commit();
  } finally {
    await tx.rollback();
    tx.release();
  }
  await assertion;
  expect(await stored(drive.id)).toBe(0);
});
