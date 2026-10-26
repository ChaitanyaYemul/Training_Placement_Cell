import { expect } from 'vitest';
import {
  admin,
  student,
  other,
  write,
  createDrive,
  publish,
  driveBody,
  nextNumber,
} from './helpers.js';

/** Fictional report cohort with two selections for one student and a withdrawn participant. */
export async function reportFixture() {
  for (const [user, enrollmentNumber, branchId] of [
    [student, 'REPORT-001', 1],
    [other, 'REPORT-002', 2],
  ]) {
    expect(
      (
        await write(user, 'patch', '/students/me', {
          fullName: 'Example Report Student',
          enrollmentNumber,
          branchId,
          graduationYear: 2030,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await write(user, 'put', '/students/me/academic-records', {
          records: [{ semester: 1, sgpa: 8, cgpa: 8, activeBacklogs: 0 }],
        })
      ).status,
    ).toBe(200);
  }
  const company = await write(admin, 'post', '/companies', {
    name: `Report company ${nextNumber()}`,
  });
  expect(company.status).toBe(201);
  const posting = await write(
    admin,
    'post',
    `/companies/${company.body.data.id}/job-postings`,
    {
      title: 'Report role',
      description: 'Fictional report fixture',
      jobType: 'full_time',
    },
  );
  expect(posting.status).toBe(201);
  const body = {
    ...driveBody(),
    jobPostingId: posting.body.data.id,
    eligibleBranchIds: [1, 2],
  };
  const first = await publish(
    await createDrive({ ...body, title: 'Report first drive' }),
  );
  const second = await publish(
    await createDrive({
      ...body,
      title: 'Report second drive',
      registrationDeadline: '2030-11-02T23:59:59.000Z',
    }),
  );
  const empty = await createDrive({
    ...body,
    title: 'Report empty drive',
    registrationDeadline: '2030-11-03T00:00:00.000Z',
  });
  for (const drive of [first, second]) {
    const application = await write(
      student,
      'post',
      `/placement-drives/${drive.id}/applications`,
      {},
    );
    expect(application.status).toBe(201);
    for (const status of ['shortlisted', 'selected'])
      expect(
        (
          await write(
            admin,
            'patch',
            `/admin/applications/${application.body.data.id}/status`,
            { status },
          )
        ).status,
      ).toBe(200);
  }
  const withdrawn = await write(
    other,
    'post',
    `/placement-drives/${first.id}/applications`,
    {},
  );
  expect(withdrawn.status).toBe(201);
  expect(
    (
      await write(
        other,
        'patch',
        `/applications/${withdrawn.body.data.id}/withdraw`,
        {},
      )
    ).status,
  ).toBe(200);
  return { companyId: company.body.data.id, first, second, empty };
}
