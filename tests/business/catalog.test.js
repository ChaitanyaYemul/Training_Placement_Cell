import { describe, it, expect } from 'vitest';
import { app, admin, student, nextNumber, write } from './helpers.js';
import request from 'supertest';
describe('Business API: catalog', () => {
  it('enforces 401/403 on every implemented administrator endpoint before validation', async () => {
    const routes = [
      ['post', '/companies'],
      ['patch', '/companies/1'],
      ['delete', '/companies/1'],
      ['post', '/companies/1/job-postings'],
      ['patch', '/job-postings/1'],
      ['delete', '/job-postings/1'],
      ['post', '/placement-drives'],
      ['patch', '/placement-drives/1'],
      ['patch', '/placement-drives/1/status'],
      ['delete', '/placement-drives/1'],
      ['put', '/placement-drives/1/rounds'],
      ['post', '/announcements'],
      ['patch', '/announcements/000000000000000000000001'],
      ['delete', '/announcements/000000000000000000000001'],
      ['get', '/admin/applications'],
      ['patch', '/admin/applications/1/status'],
    ];
    for (const [method, path] of routes) {
      const anonymous = request(app);
      expect(
        (await anonymous[method]('/api' + path).send({})).status,
        method + ' ' + path,
      ).toBe(401);
      expect(
        (await write(student, method, path, {})).status,
        method + ' ' + path,
      ).toBe(403);
    }
  });
  it('supports company CRUD, active filtering, pagination, duplicates and FK-restricted deletion', async () => {
    expect(
      (
        await write(admin, 'post', '/companies', {
          name: 'Invalid URL example',
          website: 'not-a-url',
        })
      ).status,
    ).toBe(400);
    const name = 'Company ' + nextNumber(),
      created = await write(admin, 'post', '/companies', { name });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect((await write(admin, 'post', '/companies', { name })).status).toBe(
      409,
    );
    const list = await admin.agent
      .get('/api/companies')
      .query({ q: name, limit: 1, sort: 'name' });
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].id).toBe(id);
    expect(
      (await write(admin, 'patch', `/companies/${id}`, { isActive: false }))
        .body.data.isActive,
    ).toBe(false);
    expect((await student.agent.get('/api/companies/' + id)).status).toBe(404);
    expect((await write(admin, 'delete', '/companies/' + id)).status).toBe(204);
    expect((await write(admin, 'delete', '/companies/1')).status).toBe(409);
  });
  it('supports job-posting CRUD and hides postings without a visible drive from students', async () => {
    const result = await write(admin, 'post', '/companies/1/job-postings', {
      title: 'Posting ' + nextNumber(),
      description: 'Fictional role',
      jobType: 'internship',
      ctcLpa: 2.5,
    });
    expect(result.status).toBe(201);
    const id = result.body.data.id;
    expect((await student.agent.get('/api/job-postings/' + id)).status).toBe(
      404,
    );
    expect(
      (
        await write(admin, 'patch', '/job-postings/' + id, {
          title: 'Updated posting',
        })
      ).body.data.title,
    ).toBe('Updated posting');
    expect(
      (await admin.agent.get('/api/companies/1/job-postings')).body.meta.total,
    ).toBeGreaterThan(0);
    expect((await write(admin, 'delete', '/job-postings/' + id)).status).toBe(
      204,
    );
    expect(
      (
        await write(admin, 'post', '/companies/999999/job-postings', {
          title: 'Invalid',
          description: 'Invalid',
          jobType: 'full_time',
        })
      ).status,
    ).toBe(404);
  });
});
