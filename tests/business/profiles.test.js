import { describe, it, expect } from 'vitest';
import { admin, student, other, origin, write } from './helpers.js';
describe('Business API: profiles', () => {
  it('rejects unsafe filters, pagination, ids and unknown or privileged fields', async () => {
    for (const query of [
      { limit: 101 },
      { page: 0 },
      { sort: 'password_hash' },
      { extra: 'x' },
      { 'q[$gt]': '' },
    ])
      expect(
        (await admin.agent.get('/api/companies').query(query)).status,
      ).toBe(400);
    expect(
      (await write(admin, 'post', '/companies', { name: { $gt: '' } })).status,
    ).toBe(400);
    expect((await admin.agent.get('/api/companies/1%20OR%201=1')).status).toBe(
      400,
    );
    expect(
      (
        await write(student, 'patch', '/students/me', {
          userId: other.user.id,
          role: 'admin',
        })
      ).status,
    ).toBe(400);
  });
  it('enforces CSRF and Origin on actual administrator and student writes', async () => {
    expect(
      (await admin.agent.post('/api/companies').send({ name: 'Rejected' }))
        .status,
    ).toBe(403);
    expect(
      (
        await student.agent
          .patch('/api/students/me')
          .set('Origin', origin)
          .send({ fullName: 'Rejected' })
      ).status,
    ).toBe(403);
    expect(
      (
        await admin.agent
          .post('/api/companies')
          .set('Origin', 'https://evil.example')
          .set('X-CSRF-Token', admin.token)
          .send({ name: 'Rejected' })
      ).status,
    ).toBe(403);
  });
  it('updates only the authenticated student profile and academic records', async () => {
    expect(
      (
        await write(student, 'patch', '/students/me', {
          fullName: 'Example Owner',
          enrollmentNumber: 'BUSINESS-OWNER',
          branchId: 1,
          graduationYear: 2030,
        })
      ).status,
    ).toBe(200);
    const mine = await student.agent.get('/api/students/me'),
      theirs = await other.agent.get('/api/students/me');
    expect(mine.body.data.fullName).toBe('Example Owner');
    expect(theirs.body.data.fullName).not.toBe('Example Owner');
    expect((await admin.agent.get('/api/students/me')).status).toBe(403);
    const rows = {
      records: [{ semester: 1, sgpa: 8, cgpa: 8, activeBacklogs: 0 }],
    };
    expect(
      (await write(student, 'put', '/students/me/academic-records', rows))
        .status,
    ).toBe(200);
    expect(
      (await other.agent.get('/api/students/me/academic-records')).body.data,
    ).toEqual([]);
    expect(
      (
        await write(student, 'put', '/students/me/academic-records', {
          records: [...rows.records, ...rows.records],
        })
      ).status,
    ).toBe(400);
    expect(
      (await write(student, 'patch', '/students/me', { branchId: 99999 }))
        .status,
    ).toBe(400);
    expect(
      (
        await student.agent.get(
          '/api/students/me?studentId=' + other.user.studentId,
        )
      ).status,
    ).toBe(400);
  });
});
