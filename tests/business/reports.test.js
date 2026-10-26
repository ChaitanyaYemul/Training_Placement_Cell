import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  app,
  admin,
  student,
  other,
  pool,
  mongo,
  write,
  login,
} from './helpers.js';
import { reportFixture } from './reportHelpers.js';
import { REPORT_NAMES } from '../../backend/src/validators/reportValidator.js';
import { createApp } from '../../backend/src/app.js';
import { businessDependencies } from '../../backend/src/config/businessDependencies.js';
import { getAuthSettings } from '../../backend/src/config/authConfig.js';

const report = (name, query = {}) =>
  admin.agent.get(`/api/admin/reports/${name}`).query(query);

describe('Admin reporting APIs', () => {
  it.each(REPORT_NAMES)(
    '%s rejects anonymous and student JSON/CSV requests before validation',
    async (name) => {
      for (const format of ['json', 'csv']) {
        const path = `/api/admin/reports/${name}?format=${format}&unknown=1`;
        expect((await request(app).get(path)).status).toBe(401);
        expect((await student.agent.get(path)).status).toBe(403);
      }
    },
  );

  it('overview distinguishes selection offers from placed students and merges scoped Mongo aggregates', async () => {
    const fixture = await reportFixture();
    const response = await report('overview', { companyId: fixture.companyId });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      drives: 3,
      companies: 1,
      students: 2,
      participants: 2,
      applications: 3,
      selections: 2,
      placedStudents: 1,
      placementRate: 50,
      recruitment: {
        roundTypes: [{ roundType: 'assessment', count: 2 }],
        requiredDocuments: [{ document: 'College ID', count: 2 }],
      },
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toMatch(
      /email|phone|password|enrollmentNumber|cgpa/,
    );
  });

  it('drive results preserve zero counts, paginate, and use stable reversible sorting', async () => {
    const fixture = await reportFixture();
    const response = await report('drives', {
      companyId: fixture.companyId,
      page: 3,
      limit: 1,
    });
    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({
      page: 3,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
    expect(response.body.data[0]).toMatchObject({
      driveId: fixture.empty.id,
      applications: 0,
      participants: 0,
      selections: 0,
      placedStudents: 0,
    });
    expect(
      (
        await report('drives', {
          companyId: fixture.companyId,
          sort: '-id',
          limit: 1,
        })
      ).body.data[0].driveId,
    ).toBe(fixture.empty.id);
    expect(
      (
        await report('drives', {
          companyId: fixture.companyId,
          page: 4,
          limit: 1,
        })
      ).body.data,
    ).toEqual([]);
  });

  it('company results count a selected student once across multiple drives', async () => {
    const fixture = await reportFixture();
    const response = await report('companies', {
      companyId: fixture.companyId,
    });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        companyId: fixture.companyId,
        companyName: expect.any(String),
        drives: 3,
        applications: 3,
        participants: 2,
        selections: 2,
        placedStudents: 1,
      },
    ]);
  });

  it('branch results separate current student branches and retain branches without selections', async () => {
    const fixture = await reportFixture();
    const response = await report('branches', { companyId: fixture.companyId });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        branchId: 1,
        code: 'CSE',
        name: 'Computer Science and Engineering',
        students: 1,
        drives: 3,
        applications: 2,
        participants: 1,
        selections: 2,
        placedStudents: 1,
        placementRate: 100,
      },
      {
        branchId: 2,
        code: 'ECE',
        name: 'Electronics and Communication Engineering',
        students: 1,
        drives: 3,
        applications: 1,
        participants: 1,
        selections: 0,
        placedStudents: 0,
        placementRate: 0,
      },
    ]);
  });

  it('status counts include all statuses, including zero and final withdrawal', async () => {
    const fixture = await reportFixture();
    const response = await report('statuses', { companyId: fixture.companyId });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      { status: 'applied', count: 0 },
      { status: 'shortlisted', count: 0 },
      { status: 'selected', count: 2 },
      { status: 'rejected', count: 0 },
      { status: 'withdrawn', count: 1 },
    ]);
    expect(response.body.meta.total).toBe(5);
  });

  it('participation reuses latest academic eligibility without retroactively changing historical participation', async () => {
    const fixture = await reportFixture();
    const query = { driveId: fixture.first.id };
    const before = await report('participation', query);
    expect(before.status).toBe(200);
    expect(before.body.data).toEqual([
      {
        driveId: fixture.first.id,
        title: fixture.first.title,
        eligibleStudents: 2,
        participants: 2,
        eligibleParticipants: 2,
        participationRate: 100,
      },
    ]);
    expect(
      (
        await write(other, 'put', '/students/me/academic-records', {
          records: [
            { semester: 1, sgpa: 8, cgpa: 8, activeBacklogs: 0 },
            { semester: 2, sgpa: 6, cgpa: 6, activeBacklogs: 0 },
          ],
        })
      ).status,
    ).toBe(200);
    expect((await report('participation', query)).body.data[0]).toMatchObject({
      eligibleStudents: 1,
      participants: 2,
      eligibleParticipants: 1,
      participationRate: 100,
    });
    expect(
      (await write(student, 'patch', '/students/me', { branchId: null }))
        .status,
    ).toBe(200);
    expect((await report('participation', query)).body.data[0]).toMatchObject({
      eligibleStudents: 0,
      participants: 2,
      eligibleParticipants: 0,
      participationRate: 0,
    });
  });

  it('all six reports combine company, drive, branch and inclusive UTC day filters', async () => {
    const fixture = await reportFixture();
    const query = {
      companyId: fixture.companyId,
      driveId: fixture.second.id,
      branchId: 1,
      from: '2030-11-02',
      to: '2030-11-02',
    };
    for (const name of REPORT_NAMES)
      expect((await report(name, query)).status, name).toBe(200);
    expect((await report('overview', query)).body.data).toMatchObject({
      drives: 1,
      companies: 1,
      students: 1,
      applications: 1,
      participants: 1,
      selections: 1,
      placedStudents: 1,
    });
    expect(
      (
        await report('overview', {
          ...query,
          to: '2030-11-01',
          from: '2030-11-01',
        })
      ).body.data,
    ).toMatchObject({ drives: 0, applications: 0, selections: 0 });
    expect(
      (await report('overview', { ...query, branchId: 2 })).body.data,
    ).toMatchObject({ drives: 1, students: 1, applications: 0, selections: 0 });
  });

  it('rejects unknown, injected, malformed and reversed filters on every report', async () => {
    for (const name of REPORT_NAMES)
      expect((await report(name, { unknown: 'x' })).status).toBe(400);
    for (const query of [
      { companyId: '1 OR 1=1' },
      { branchId: { $gt: 0 } },
      { from: '2030-02-30' },
      { from: '2030-11-02', to: '2030-11-01' },
      { limit: 101 },
      { page: 0 },
      { sort: 'title' },
      { format: 'xlsx' },
    ])
      expect(
        (await report('drives', query)).status,
        JSON.stringify(query),
      ).toBe(400);
  });

  it('exports every report with headers, all filtered pages, escaping and spreadsheet formula protection', async () => {
    const fixture = await reportFixture();
    expect(
      (
        await write(admin, 'patch', `/placement-drives/${fixture.empty.id}`, {
          title: '=SUM(1,1)\n"Demo"',
        })
      ).status,
    ).toBe(200);
    for (const name of REPORT_NAMES) {
      const response = await report(name, {
        companyId: fixture.companyId,
        format: 'csv',
        page: 2,
        limit: 1,
      });
      expect(response.status, name).toBe(200);
      expect(response.headers['content-type']).toMatch(/^text\/csv/);
      expect(response.headers['content-disposition']).toBe(
        `attachment; filename="placement-${name}.csv"`,
      );
      expect(response.text).not.toMatch(/email|password|enrollmentNumber|cgpa/);
    }
    const csv = (
      await report('drives', {
        companyId: fixture.companyId,
        format: 'csv',
        limit: 1,
      })
    ).text;
    expect(csv).toContain('"Report first drive"');
    expect(csv).toContain('"Report second drive"');
    expect(csv).toContain('"\'=SUM(1,1)\n""Demo"""');
    expect(
      (
        await report('overview', {
          companyId: fixture.companyId,
          format: 'csv',
        })
      ).text,
    ).toContain('"roundTypes","assessment","2"');
  });

  it('returns deterministic empty reports and header-only table exports for missing cohorts', async () => {
    const query = { companyId: 4294967295 };
    expect((await report('overview', query)).body.data).toMatchObject({
      drives: 0,
      participants: 0,
      applications: 0,
      selections: 0,
      placedStudents: 0,
      placementRate: 0,
      recruitment: { roundTypes: [], requiredDocuments: [] },
    });
    for (const name of ['drives', 'companies', 'participation']) {
      const response = await report(name, query);
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
      expect(
        (await report(name, { ...query, format: 'csv' })).text.split('\r\n'),
      ).toHaveLength(2);
    }
  });

  it('keeps SQL placement reports available when the Mongo aggregation boundary fails', async () => {
    const fixture = await reportFixture();
    const settings = getAuthSettings();
    const outageApp = createApp({
      pool,
      security: settings,
      mountBusiness: businessDependencies(pool, mongo, settings, {
        reportRecruitment: {
          async summary() {
            const error = new Error('Unavailable');
            error.name = 'MongoNetworkError';
            throw error;
          },
        },
      }),
    });
    try {
      const user = await login('business-admin@example.edu', outageApp);
      const response = await user.agent
        .get('/api/admin/reports/overview')
        .query({ companyId: fixture.companyId });
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        applications: 3,
        selections: 2,
        recruitment: null,
      });
      expect(response.body.warnings).toEqual([
        { code: 'REPORT_RECRUITMENT_UNAVAILABLE' },
      ]);
      expect(
        (
          await user.agent
            .get('/api/admin/reports/overview')
            .query({ format: 'csv' })
        ).text,
      ).toContain('"recruitment","availability","unavailable"');
      expect((await user.agent.get('/api/admin/reports/drives')).status).toBe(
        200,
      );
    } finally {
      await outageApp.locals.closeSessions();
    }
  });
});
