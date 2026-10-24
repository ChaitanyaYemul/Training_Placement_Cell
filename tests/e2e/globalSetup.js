import {
  freshMysql,
  freshMongo,
  mysqlFixtures,
  validRecruitment,
} from '../db/helpers.js';
import { applyMongoSchemas } from '../../backend/src/repositories/mongoSchemaRepository.js';
import { hashPassword } from '../../backend/src/services/passwordService.js';
export default async function globalSetup() {
  const { pool } = await freshMysql();
  let mongo;
  try {
    mongo = await freshMongo();
    await applyMongoSchemas(mongo);
    await mysqlFixtures(pool);
    // Fictional test-only accounts; never run against development/production databases.
    await pool.execute('UPDATE users SET password_hash = ?', [
      await hashPassword('test-only-browser-password'),
    ]);
    await pool.execute(
      "UPDATE placement_drives SET status = 'published' WHERE id = 1",
    );
    await mongo.db
      .collection('recruitment_processes')
      .insertOne(validRecruitment());
    await pool.execute(
      "INSERT INTO student_applications (drive_id, student_id, status) VALUES (1, 1, 'applied')",
    );
    await pool.execute(
      "INSERT INTO application_status_history (application_id, to_status, changed_by) VALUES (1, 'applied', 2)",
    );
    await mongo.db.collection('placement_announcements').insertOne({
      title: 'Example campus briefing',
      body: 'Bring your college ID to the placement briefing.',
      status: 'published',
      priority: 'normal',
      audience: { type: 'all', branchIds: [] },
      relatedDriveId: 1,
      links: [],
      isPinned: false,
      publishedAt: new Date('2020-01-01T00:00:00Z'),
      expiresAt: null,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    });
  } finally {
    await pool.end();
    if (mongo) await mongo.close();
  }
}
