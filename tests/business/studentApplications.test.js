import { it, expect } from 'vitest';
import request from 'supertest';
import {
  app,
  pool,
  student,
  admin,
  other,
  write,
  driveBody,
  createDrive,
  openDrive,
  apply,
  advance,
  stored,
} from './studentApplicationHelpers.js';

it('BR-04/09/10: applies as self with initial history and keeps detail ownership private', async () => {
  const drive = await openDrive();
  const row = await apply(drive);
  expect(row.studentId).toBe(student.user.studentId);
  expect(row.status).toBe('applied');
  expect(row.history).toMatchObject([
    {
      fromStatus: null,
      toStatus: 'applied',
      changedBy: student.user.id,
      actorRole: 'student',
    },
  ]);
  expect((await student.agent.get(`/api/applications/${row.id}`)).status).toBe(
    200,
  );
  expect((await admin.agent.get(`/api/applications/${row.id}`)).status).toBe(
    200,
  );
  expect((await other.agent.get(`/api/applications/${row.id}`)).status).toBe(
    404,
  );
  expect(
    (await write(other, 'patch', `/applications/${row.id}/withdraw`, {}))
      .status,
  ).toBe(404);
  const list = await student.agent.get('/api/applications/me');
  expect(list.body.data.some((item) => item.id === row.id)).toBe(true);
  const detail = await student.agent.get(`/api/placement-drives/${drive.id}`);
  expect(detail.body.data.hasApplied).toBe(true);
});

it('BR-10/17: protects new routes with roles, CSRF, exact Origin and strict empty bodies', async () => {
  const drive = await openDrive();
  const path = `/placement-drives/${drive.id}/applications`;
  expect(
    (
      await request(app)
        .post('/api' + path)
        .send({})
    ).status,
  ).toBe(401);
  expect((await write(admin, 'post', path, {})).status).toBe(403);
  expect(
    (
      await student.agent
        .post('/api' + path)
        .set('Origin', 'http://localhost:5173')
        .send({})
    ).status,
  ).toBe(403);
  expect(
    (
      await student.agent
        .post('/api' + path)
        .set('Origin', 'https://untrusted.example')
        .set('X-CSRF-Token', student.token)
        .send({})
    ).status,
  ).toBe(403);
  for (const body of [
    { studentId: other.user.studentId },
    { status: 'selected' },
    { role: 'admin' },
  ])
    expect((await write(student, 'post', path, body)).status).toBe(400);
  expect(
    (
      await write(
        student,
        'post',
        '/placement-drives/not-an-id/applications',
        {},
      )
    ).status,
  ).toBe(400);
  const row = await apply(drive);
  expect((await request(app).get(`/api/applications/${row.id}`)).status).toBe(
    401,
  );
  expect(
    (await request(app).patch(`/api/applications/${row.id}/withdraw`).send({}))
      .status,
  ).toBe(401);
  expect(
    (await write(admin, 'patch', `/applications/${row.id}/withdraw`, {}))
      .status,
  ).toBe(403);
  expect(
    (
      await student.agent
        .patch(`/api/applications/${row.id}/withdraw`)
        .set('Origin', 'http://localhost:5173')
        .send({})
    ).status,
  ).toBe(403);
  expect(
    (
      await write(student, 'patch', `/applications/${row.id}/withdraw`, {
        studentId: other.user.studentId,
      })
    ).status,
  ).toBe(400);
  expect(
    (await student.agent.get(`/api/applications/${row.id}?studentId=1`)).status,
  ).toBe(400);
  expect((await student.agent.get('/api/applications/999999')).status).toBe(
    404,
  );
});

it.each([
  'full_name',
  'enrollment_number',
  'branch_id',
  'graduation_year',
  'academic_records',
])(
  'BR-15: rejects incomplete profile field %s without an application',
  async (missing) => {
    const drive = await openDrive();
    if (missing === 'academic_records')
      await pool.execute('DELETE FROM academic_records WHERE student_id=?', [
        student.user.studentId,
      ]);
    else {
      const statements = {
        full_name: 'UPDATE students SET full_name=NULL WHERE id=?',
        enrollment_number:
          'UPDATE students SET enrollment_number=NULL WHERE id=?',
        branch_id: 'UPDATE students SET branch_id=NULL WHERE id=?',
        graduation_year: 'UPDATE students SET graduation_year=NULL WHERE id=?',
      };
      await pool.execute(statements[missing], [student.user.studentId]);
    }
    const result = await write(
      student,
      'post',
      `/placement-drives/${drive.id}/applications`,
      {},
    );
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe('PROFILE_INCOMPLETE');
    expect(result.body.error.details.length).toBeGreaterThan(0);
    expect(await stored(drive.id)).toBe(0);
  },
);

it.each([
  ['MIN_CGPA', { minCgpa: 9 }],
  ['BRANCH', { eligibleBranchIds: [2] }],
  ['GRADUATION_YEAR', { eligibleGraduationYear: 2031 }],
  ['BACKLOGS', { maxActiveBacklogs: 0 }],
])(
  'BR-05: rejects unmet %s using backend eligibility evaluation',
  async (reason, overrides) => {
    if (reason === 'BACKLOGS')
      await pool.execute(
        'UPDATE academic_records SET active_backlogs=1 WHERE student_id=?',
        [student.user.studentId],
      );
    const drive = await openDrive({ ...driveBody(), ...overrides });
    const result = await write(
      student,
      'post',
      `/placement-drives/${drive.id}/applications`,
      {},
    );
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('NOT_ELIGIBLE');
    expect(result.body.error.details).toContainEqual({
      field: `eligibility.${reason}`,
      message: 'Criterion not met',
    });
    expect(await stored(drive.id)).toBe(0);
  },
);

it('BR-05: uses the latest semester and accepts exact CGPA/backlog boundaries', async () => {
  await pool.execute(
    'INSERT INTO academic_records (student_id,semester,sgpa,cgpa,active_backlogs) VALUES (?,2,7,7,1)',
    [student.user.studentId],
  );
  const allowed = await openDrive({
    ...driveBody(),
    minCgpa: 7,
    maxActiveBacklogs: 1,
  });
  await apply(allowed);
  const rejected = await openDrive({
    ...driveBody(),
    minCgpa: 7.01,
    maxActiveBacklogs: 1,
  });
  expect(
    (
      await write(
        student,
        'post',
        `/placement-drives/${rejected.id}/applications`,
        {},
      )
    ).body.error.code,
  ).toBe('NOT_ELIGIBLE');
});

it('BR-01/02/03/08: rejects hidden, closed, expired and exactly-at-deadline drives', async () => {
  const draft = await createDrive();
  expect(
    (
      await write(
        student,
        'post',
        `/placement-drives/${draft.id}/applications`,
        {},
      )
    ).status,
  ).toBe(404);
  expect(
    (await write(student, 'post', '/placement-drives/999999/applications', {}))
      .status,
  ).toBe(404);
  for (const status of ['completed', 'cancelled', 'archived']) {
    const drive = await openDrive();
    await write(admin, 'patch', `/placement-drives/${drive.id}/status`, {
      status: status === 'archived' ? 'completed' : status,
    });
    if (status === 'archived')
      await write(admin, 'patch', `/placement-drives/${drive.id}/status`, {
        status: 'archived',
      });
    const result = await write(
      student,
      'post',
      `/placement-drives/${drive.id}/applications`,
      {},
    );
    expect(result.status).toBe(status === 'archived' ? 404 : 409);
    expect(await stored(drive.id)).toBe(0);
  }
  for (const expression of [
    'UTC_TIMESTAMP()',
    'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)',
  ]) {
    const drive = await openDrive();
    // Both SQL expressions are fixed test fixtures, not user input.
    await pool.execute(
      `UPDATE placement_drives SET registration_deadline=${expression} WHERE id=?`,
      [drive.id],
    );
    const result = await write(
      student,
      'post',
      `/placement-drives/${drive.id}/applications`,
      {},
    );
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe('DEADLINE_PASSED');
    expect(await stored(drive.id)).toBe(0);
  }
});

it('BR-09/16/A-07: withdraws shortlisted applications permanently and preserves ordered history after archive', async () => {
  const drive = await openDrive();
  const row = await apply(drive);
  await advance(row, 'shortlisted');
  const result = await write(
    student,
    'patch',
    `/applications/${row.id}/withdraw`,
    {},
  );
  expect(result.status).toBe(200);
  expect(result.body.data.status).toBe('withdrawn');
  expect(result.body.data.history.map((h) => h.toStatus)).toEqual([
    'applied',
    'shortlisted',
    'withdrawn',
  ]);
  expect(result.body.data.history.at(-1).changedBy).toBe(student.user.id);
  expect(
    (await write(student, 'patch', `/applications/${row.id}/withdraw`, {}))
      .status,
  ).toBe(409);
  expect(
    (
      await write(
        student,
        'post',
        `/placement-drives/${drive.id}/applications`,
        {},
      )
    ).body.error.code,
  ).toBe('DUPLICATE_APPLICATION');
  await write(admin, 'patch', `/placement-drives/${drive.id}/status`, {
    status: 'completed',
  });
  await write(admin, 'patch', `/placement-drives/${drive.id}/status`, {
    status: 'archived',
  });
  expect(
    (await student.agent.get(`/api/placement-drives/${drive.id}`)).status,
  ).toBe(404);
  const archived = await student.agent.get(`/api/applications/${row.id}`);
  expect(archived.status).toBe(200);
  expect(archived.body.data.driveStatus).toBe('archived');
  expect(archived.body.data.history).toHaveLength(3);
  expect(JSON.stringify(archived.body)).not.toContain('password');
  expect(JSON.stringify(archived.body)).not.toContain('@example.edu');
});

it.each(['selected', 'rejected'])(
  'BR-09/16: refuses withdrawal of terminal status %s',
  async (status) => {
    const row = await apply(await openDrive());
    if (status === 'selected') await advance(row, 'shortlisted');
    await advance(row, status);
    const result = await write(
      student,
      'patch',
      `/applications/${row.id}/withdraw`,
      {},
    );
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  },
);

it('A-11: later academic edits do not revoke an application or prevent its withdrawal', async () => {
  const row = await apply(await openDrive());
  await pool.execute('UPDATE academic_records SET cgpa=0 WHERE student_id=?', [
    student.user.studentId,
  ]);
  expect(
    (await student.agent.get(`/api/applications/${row.id}`)).body.data.status,
  ).toBe('applied');
  expect(
    (await write(student, 'patch', `/applications/${row.id}/withdraw`, {}))
      .status,
  ).toBe(200);
});
