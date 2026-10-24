import request from 'supertest';
import { createApp } from '../../backend/src/app.js';
import { getAuthSettings } from '../../backend/src/config/authConfig.js';
import { businessDependencies } from '../../backend/src/config/businessDependencies.js';
import { authService } from '../../backend/src/services/authService.js';
import { authRepository } from '../../backend/src/repositories/authRepository.js';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import {
  freshMysql,
  freshMongo,
  mysqlFixtures,
  validRecruitment,
} from '../db/helpers.js';
import { getMongoSettings } from '../../backend/src/config/databaseEnv.js';
import { applyMongoSchemas } from '../../backend/src/repositories/mongoSchemaRepository.js';
import { recruitmentProcessModel } from '../../backend/src/models/mongodb/recruitmentProcessModel.js';
import { recruitmentRepository } from '../../backend/src/repositories/recruitmentRepository.js';
import { driveRepository } from '../../backend/src/repositories/driveRepository.js';
import { catalogRepositories } from '../../backend/src/repositories/catalogRepository.js';
import { studentRepository } from '../../backend/src/repositories/studentRepository.js';
import { driveService } from '../../backend/src/services/driveService.js';
let pool, mongo, service, app, agent, token, studentAgent, studentToken;
beforeAll(async () => {
  expect(getMongoSettings().MONGODB_URI).toBe(
    'mongodb://127.0.0.1:27018/placement_test',
  );
  ({ pool } = await freshMysql());
  await mysqlFixtures(pool);
  mongo = await freshMongo();
  await applyMongoSchemas(mongo);
  await recruitmentProcessModel(mongo).create(validRecruitment());
  await pool.execute(
    "UPDATE placement_drives SET status='published' WHERE id=1",
  );
  const credentials = {
    email: 'outage-admin@example.edu',
    password: 'test-only-password',
    fullName: 'Outage Test Administrator',
  };
  await authService(authRepository(pool)).provisionAdmin(credentials);
  const security = getAuthSettings();
  app = createApp({
    pool,
    security,
    mountBusiness: businessDependencies(pool, mongo, security),
  });
  agent = request.agent(app);
  const initial = (await agent.get('/api/auth/csrf-token')).body.data.csrfToken;
  const login = await agent
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:5173')
    .set('X-CSRF-Token', initial)
    .send({ email: credentials.email, password: credentials.password });
  expect(login.status).toBe(200);
  token = login.body.data.csrfToken;
  const studentCredentials = {
    email: 'outage-student@example.edu',
    password: 'test-only-password',
    fullName: 'Example Outage Student',
  };
  const registered = await authService(authRepository(pool)).register(
    studentCredentials,
  );
  const identity = await authRepository(pool).user(registered.id);
  await pool.execute(
    "UPDATE students SET enrollment_number='OUTAGE-APP', branch_id=1, graduation_year=2030 WHERE id=?",
    [identity.studentId],
  );
  await pool.execute(
    'INSERT INTO academic_records (student_id,semester,sgpa,cgpa,active_backlogs) VALUES (?,1,8,8,0)',
    [identity.studentId],
  );
  studentAgent = request.agent(app);
  const studentInitial = (await studentAgent.get('/api/auth/csrf-token')).body
    .data.csrfToken;
  const studentLogin = await studentAgent
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:5173')
    .set('X-CSRF-Token', studentInitial)
    .send({
      email: studentCredentials.email,
      password: studentCredentials.password,
    });
  expect(studentLogin.status).toBe(200);
  studentToken = studentLogin.body.data.csrfToken;
  service = driveService({
    pool,
    ...catalogRepositories(pool),
    drives: driveRepository(pool),
    students: studentRepository(pool),
    recruitment: recruitmentRepository(mongo),
  });
});
afterAll(async () => {
  if (app) await app.locals.closeSessions();
  if (mongo) await mongo.close();
  if (pool) await pool.end();
});
it('degrades a real MongoDB outage without losing relational drive data', async () => {
  const actor = { id: 1, role: 'admin' };
  expect((await service.get(1, actor)).data.recruitment.rounds).toHaveLength(1);
  execFileSync('docker', ['stop', 'placement-phase2-mongo'], { stdio: 'pipe' });
  try {
    const result = await service.get(1, actor);
    expect(result.data.id).toBe(1);
    expect(result.data.recruitment).toBeNull();
    expect(result.warnings[0].code).toBe('RECRUITMENT_DATA_UNAVAILABLE');
    // Application submission, history and withdrawal depend only on MySQL, including during a real Mongo outage.
    const applied = await studentAgent
      .post('/api/placement-drives/1/applications')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', studentToken)
      .send({});
    expect(applied.status).toBe(201);
    expect(applied.body.data.history).toHaveLength(1);
    expect(
      (await studentAgent.get(`/api/applications/${applied.body.data.id}`))
        .status,
    ).toBe(200);
    const withdrawn = await studentAgent
      .patch(`/api/applications/${applied.body.data.id}/withdraw`)
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', studentToken)
      .send({});
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.history.map((event) => event.toStatus)).toEqual([
      'applied',
      'withdrawn',
    ]);
    const write = await agent
      .put('/api/placement-drives/1/rounds')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', token)
      .send({
        rounds: [
          {
            roundNumber: 1,
            roundName: 'Assessment',
            roundType: 'assessment',
            mode: 'online',
            scheduledAt: null,
            details: {},
          },
        ],
        requiredDocuments: ['Resume'],
        additionalRequirements: {},
        version: 0,
      });
    expect(write.status).toBe(503);
    expect(write.body.error.code).toBe('SERVICE_UNAVAILABLE');
    const [[row]] = await pool.query(
      'SELECT status FROM placement_drives WHERE id=1',
    );
    expect(row.status).toBe('published');
  } finally {
    execFileSync('docker', ['start', 'placement-phase2-mongo'], {
      stdio: 'pipe',
    });
    let ready = false;
    for (let i = 0; i < 10; i++) {
      try {
        await mongo.db.command({ ping: 1 });
        ready = true;
        break;
      } catch {
        await setTimeout(500);
      }
    }
    expect(ready).toBe(true);
  }
  expect((await service.get(1, actor)).data.recruitment.rounds).toHaveLength(1);
}, 45000);
