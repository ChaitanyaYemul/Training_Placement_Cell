import { describe, it, expect } from 'vitest';
import {
  pool,
  admin,
  student,
  roundBody,
  driveBody,
  write,
  createDrive,
  publish,
} from './helpers.js';
describe('Business API: drives', () => {
  it('BR-01/02/18: hides drafts/archives, validates publication and exposes student eligibility without N+1 Mongo reads', async () => {
    const drive = await createDrive();
    expect(
      (await student.agent.get('/api/placement-drives/' + drive.id)).status,
    ).toBe(404);
    expect(
      (await student.agent.get('/api/placement-drives?status=draft')).body.data,
    ).toEqual([]);
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${drive.id}/status`, {
          status: 'published',
        })
      ).status,
    ).toBe(409);
    await publish(drive);
    const detail = await student.agent.get('/api/placement-drives/' + drive.id);
    expect(detail.status).toBe(200);
    expect(detail.body.data.myEligibility.eligible).toBe(true);
    expect(detail.body.data.hasApplied).toBe(false);
    expect((await student.agent.get('/api/job-postings/1')).status).toBe(200);
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${drive.id}/status`, {
          status: 'completed',
        })
      ).status,
    ).toBe(200);
    expect(
      (await student.agent.get('/api/placement-drives/' + drive.id)).body.data
        .status,
    ).toBe('completed');
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${drive.id}/status`, {
          status: 'archived',
        })
      ).status,
    ).toBe(200);
    expect(
      (await student.agent.get('/api/placement-drives/' + drive.id)).status,
    ).toBe(404);
  });
  it('uses the DB clock for publish deadlines and rejects missing eligibility or invalid parent references', async () => {
    const body = driveBody();
    body.registrationDeadline = '2020-01-01T00:00:00.000Z';
    const expired = await createDrive(body);
    await write(
      admin,
      'put',
      `/placement-drives/${expired.id}/rounds`,
      roundBody(),
    );
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${expired.id}/status`, {
          status: 'published',
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await write(admin, 'post', '/placement-drives', {
          ...driveBody(),
          jobPostingId: 999999,
        })
      ).status,
    ).toBe(404);
    const missing = await createDrive({ ...driveBody(), minCgpa: null });
    await write(
      admin,
      'put',
      `/placement-drives/${missing.id}/rounds`,
      roundBody(),
    );
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${missing.id}/status`, {
          status: 'published',
        })
      ).status,
    ).toBe(409);
  });
  it('extends but never shortens published deadlines; preserves eligibility after applications (BR-13/14)', async () => {
    const drive = await createDrive();
    await publish(drive);
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${drive.id}`, {
          registrationDeadline: '2030-10-01T00:00:00.000Z',
        })
      ).status,
    ).toBe(409);
    const extended = await write(
      admin,
      'patch',
      `/placement-drives/${drive.id}`,
      { registrationDeadline: '2030-12-01T00:00:00.000Z' },
    );
    expect(extended.status).toBe(200);
    expect(extended.body.data.eligibleBranches).toHaveLength(1);
    await pool.execute(
      'INSERT INTO student_applications (drive_id,student_id) VALUES (?, ?)',
      [drive.id, student.user.studentId],
    );
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${drive.id}`, {
          minCgpa: 9,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${drive.id}`, {
          eligibleBranchIds: [2],
        })
      ).status,
    ).toBe(409);
    expect(
      (await write(admin, 'delete', `/placement-drives/${drive.id}`)).status,
    ).toBe(409);
  });
});
