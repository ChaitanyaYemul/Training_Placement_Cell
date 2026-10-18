import { describe, it, expect } from 'vitest';
import {
  pool,
  admin,
  student,
  other,
  studentIdentity,
  nextNumber,
  write,
  createDrive,
} from './helpers.js';
import { authRepository } from '../../backend/src/repositories/authRepository.js';
describe('Business API: announcements', () => {
  it('supports announcements CRUD, publication windows, branch audiences and safe links', async () => {
    const body = {
      title: 'Announcement ' + nextNumber(),
      body: 'Fictional public briefing',
      audience: { type: 'branches', branchIds: [1] },
      relatedDriveId: null,
    };
    const created = await write(admin, 'post', '/announcements', body);
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect(
      (await student.agent.get('/api/announcements?q=' + body.title)).body.data,
    ).toEqual([]);
    expect(
      (
        await write(admin, 'patch', '/announcements/' + id, {
          status: 'published',
          publishedAt: '2020-01-01T00:00:00.000Z',
        })
      ).status,
    ).toBe(200);
    expect(
      (await student.agent.get('/api/announcements').query({ q: body.title }))
        .body.data,
    ).toHaveLength(1);
    expect(
      (await other.agent.get('/api/announcements').query({ q: body.title }))
        .body.data,
    ).toHaveLength(0);
    expect(
      (
        await write(admin, 'patch', '/announcements/' + id, {
          links: [{ label: 'Bad', url: 'javascript:alert(1)' }],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await write(admin, 'patch', '/announcements/' + id, {
          expiresAt: '2021-01-01T00:00:00.000Z',
        })
      ).status,
    ).toBe(200);
    expect(
      (await student.agent.get('/api/announcements').query({ q: body.title }))
        .body.data,
    ).toHaveLength(0);
    expect((await write(admin, 'delete', '/announcements/' + id)).status).toBe(
      204,
    );
    expect(
      (
        await write(admin, 'post', '/announcements', {
          ...body,
          relatedDriveId: 999999,
        })
      ).status,
    ).toBe(404);
  });
  it('lists only own applications and records valid administrator status changes atomically (BR-09/10)', async () => {
    const drive = await createDrive();
    const [insert] = await pool.execute(
      'INSERT INTO student_applications (drive_id,student_id) VALUES (?, ?)',
      [drive.id, student.user.studentId],
    );
    expect((await other.agent.get('/api/applications/me')).body.data).toEqual(
      [],
    );
    expect(
      (await student.agent.get('/api/applications/me')).body.data.some(
        (row) => row.id === insert.insertId,
      ),
    ).toBe(true);
    expect(
      (
        await write(
          admin,
          'patch',
          `/admin/applications/${insert.insertId}/status`,
          { status: 'selected' },
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await write(
          admin,
          'patch',
          `/admin/applications/${insert.insertId}/status`,
          { status: 'shortlisted' },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await write(
          admin,
          'patch',
          `/admin/applications/${insert.insertId}/status`,
          { status: 'selected' },
        )
      ).status,
    ).toBe(200);
    const [[history]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM application_status_history WHERE application_id = ?',
      [insert.insertId],
    );
    expect(history.total).toBe(2);
    expect(
      (
        await admin.agent.get('/api/admin/applications?status=selected')
      ).body.data.some((row) => row.id === insert.insertId),
    ).toBe(true);
    expect((await authRepository(pool).user(studentIdentity.id)).role).toBe(
      'student',
    );
  });
});
