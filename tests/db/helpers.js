import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import {
  assertTestDatabase,
  getMysqlSettings,
  getMongoSettings,
  mongoDatabaseName,
} from '../../backend/src/config/databaseEnv.js';
import { createMysqlPool } from '../../backend/src/config/mysqlPool.js';
import { connectMongo } from '../../backend/src/config/mongoConnection.js';
import {
  readMigrations,
  migrateMysql,
} from '../../backend/src/repositories/migrationRepository.js';
import { seedMysql } from '../../backend/src/repositories/seedRepository.js';
export function requireTestSettings() {
  const mysql = getMysqlSettings();
  const mongo = getMongoSettings();
  assertTestDatabase(mysql.MYSQL_DATABASE);
  assertTestDatabase(mongoDatabaseName(mongo.MONGODB_URI));
  return { mysql, mongo };
}
export async function freshMysql({ useConfiguredName = false } = {}) {
  const { mysql: configured } = requireTestSettings();
  const settings = {
    ...configured,
    MYSQL_DATABASE: useConfiguredName
      ? configured.MYSQL_DATABASE
      : `placement_${randomBytes(8).toString('hex')}_test`,
  };
  const admin = await mysql.createConnection({
    host: settings.MYSQL_HOST,
    port: settings.MYSQL_PORT,
    user: settings.MYSQL_USER,
    password: settings.MYSQL_PASSWORD,
  });
  try {
    // Test settings and suffix were validated before even opening a connection.
    await admin.query(
      'CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
      [settings.MYSQL_DATABASE],
    );
  } finally {
    await admin.end();
  }
  const pool = createMysqlPool(settings);
  const applied = await migrateMysql(pool, await readMigrations());
  await seedMysql(pool);
  return { pool, applied };
}
export async function freshMongo({ useConfiguredName = false } = {}) {
  const { mongo } = requireTestSettings();
  const uri = new URL(mongo.MONGODB_URI);
  if (!useConfiguredName)
    uri.pathname = `/placement_${randomBytes(8).toString('hex')}_test`;
  const connection = await connectMongo({ MONGODB_URI: uri.toString() });
  assertTestDatabase(connection.name);
  return connection;
}
export async function clearMongo(connection) {
  assertTestDatabase(connection.name);
  for (const name of ['recruitment_processes', 'placement_announcements'])
    await connection.db.collection(name).deleteMany({});
}
export async function mysqlFixtures(pool) {
  // Test-only sentinel values are not usable password hashes. Seeds create no accounts.
  await pool.execute(`INSERT INTO users (id, email, password_hash, role) VALUES
    (1, 'admin-test@example.edu', 'not-an-authentication-hash', 'admin'),
    (2, 'student-test@example.edu', 'not-an-authentication-hash', 'student'),
    (3, 'concurrent-test@example.edu', 'not-an-authentication-hash', 'student')`);
  await pool.execute(
    "INSERT INTO admins (user_id, full_name) VALUES (1, 'Example Test Administrator')",
  );
  await pool.execute(`INSERT INTO students (id, user_id, enrollment_number, full_name, branch_id, graduation_year)
    SELECT 1, 2, 'TEST-001', 'Example Test Student', b.id, 2030 FROM branches AS b WHERE b.code = 'CSE'`);
  await pool.execute(
    "INSERT INTO students (id, user_id, enrollment_number, full_name) VALUES (2, 3, 'TEST-002', 'Concurrent Test Student')",
  );
  await pool.execute(
    'INSERT INTO academic_records (student_id, semester, sgpa, cgpa, active_backlogs) VALUES (1, 1, 7.5, 7.5, 0), (1, 2, 8.5, 8.0, 0)',
  );
  await pool.execute(`INSERT INTO placement_drives (id, job_posting_id, title, registration_deadline, min_cgpa, max_active_backlogs, eligible_graduation_year, created_by)
    SELECT 1, j.id, 'Example Test Drive', '2030-11-01 00:00:00', 7.00, 0, 2030, 1 FROM job_postings AS j WHERE j.title = 'Graduate Developer (Sample)'`);
  await pool.execute(
    "INSERT INTO drive_eligible_branches (drive_id, branch_id) SELECT 1, b.id FROM branches AS b WHERE b.code = 'CSE'",
  );
}
export function validRecruitment() {
  return {
    placementDriveId: 1,
    rounds: [
      {
        roundNumber: 1,
        roundName: 'Assessment',
        roundType: 'assessment',
        description: '',
        mode: 'online',
        scheduledAt: new Date('2030-11-15T09:30:00Z'),
        details: { durationMinutes: 60 },
      },
    ],
    requiredDocuments: ['College ID Card'],
    additionalRequirements: {},
    schemaVersion: 1,
    updatedBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  };
}
export function validAnnouncement() {
  return {
    title: 'Sample briefing',
    body: 'Fictional briefing',
    status: 'published',
    priority: 'normal',
    audience: { type: 'all', branchIds: [] },
    relatedDriveId: 1,
    links: [],
    isPinned: false,
    publishedAt: new Date('2030-01-01T00:00:00Z'),
    expiresAt: null,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  };
}
