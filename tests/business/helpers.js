import { beforeAll, beforeEach, afterEach, afterAll, expect } from 'vitest';
import request from 'supertest';
import { freshMysql, freshMongo } from '../db/helpers.js';
import { applyMongoSchemas } from '../../backend/src/repositories/mongoSchemaRepository.js';
import { authService } from '../../backend/src/services/authService.js';
import { authRepository } from '../../backend/src/repositories/authRepository.js';
import { getAuthSettings } from '../../backend/src/config/authConfig.js';
import { createApp } from '../../backend/src/app.js';
import { businessDependencies } from '../../backend/src/config/businessDependencies.js';
export let pool, mongo, app, admin, student, other, studentIdentity;
let number = 0;
export const nextNumber = () => ++number;
export const origin = 'http://localhost:5173',
  password = 'test-only-password';
const account = (email) => ({ email, password, fullName: 'Example Test User' });
export const roundBody = () => ({
  rounds: [
    {
      roundNumber: 1,
      roundName: 'Assessment',
      roundType: 'assessment',
      mode: 'online',
      scheduledAt: '2030-11-15T09:30:00.000Z',
      details: { durationMinutes: 60 },
    },
  ],
  requiredDocuments: ['College ID'],
  additionalRequirements: { venue: 'Example College' },
});
export const driveBody = () => ({
  jobPostingId: 1,
  title: 'Example Drive ' + ++number,
  registrationDeadline: '2030-11-01T00:00:00.000Z',
  minCgpa: 7,
  maxActiveBacklogs: 0,
  eligibleGraduationYear: 2030,
  eligibleBranchIds: [1],
});
export function makeApp(recruitment) {
  const settings = getAuthSettings();
  return createApp({
    pool,
    security: settings,
    mountBusiness: businessDependencies(pool, mongo, settings, { recruitment }),
  });
}
export async function login(email, application = app) {
  const agent = request.agent(application);
  const token = (await agent.get('/api/auth/csrf-token')).body.data.csrfToken;
  const response = await agent
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', token)
    .send({ email, password });
  expect(response.status).toBe(200);
  return {
    agent,
    token: response.body.data.csrfToken,
    user: response.body.data.user,
  };
}
export function write(user, method, path, body) {
  return user.agent[method]('/api' + path)
    .set('Origin', origin)
    .set('X-CSRF-Token', user.token)
    .send(body);
}
export async function createDrive(body = driveBody()) {
  const result = await write(admin, 'post', '/placement-drives', body);
  expect(result.status).toBe(201);
  return result.body.data;
}
export async function publish(drive) {
  const current = await admin.agent.get(
    `/api/placement-drives/${drive.id}/rounds`,
  );
  if (!current.body.data)
    expect(
      (
        await write(
          admin,
          'put',
          `/placement-drives/${drive.id}/rounds`,
          roundBody(),
        )
      ).status,
    ).toBe(200);
  const result = await write(
    admin,
    'patch',
    `/placement-drives/${drive.id}/status`,
    { status: 'published' },
  );
  expect(result.status).toBe(200);
  return result.body.data;
}
beforeAll(async () => {
  ({ pool } = await freshMysql());
  mongo = await freshMongo();
  await applyMongoSchemas(mongo);
  const auth = authService(authRepository(pool));
  await auth.provisionAdmin(account('business-admin@example.edu'));
  studentIdentity = await auth.register(
    account('business-student@example.edu'),
  );
  await auth.register(account('business-other@example.edu'));
  const student = await authRepository(pool).user(studentIdentity.id);
  await pool.execute(
    'UPDATE students SET branch_id=1, graduation_year=2030 WHERE id=?',
    [student.studentId],
  );
  await pool.execute(
    'INSERT INTO academic_records (student_id,semester,sgpa,cgpa,active_backlogs) VALUES (?,1,8,8,0)',
    [student.studentId],
  );
});
beforeEach(async () => {
  app = makeApp();
  admin = await login('business-admin@example.edu');
  student = await login('business-student@example.edu');
  other = await login('business-other@example.edu');
});
afterEach(async () => {
  await app.locals.closeSessions();
});
afterAll(async () => {
  if (mongo) await mongo.close();
  if (pool) await pool.end();
});
