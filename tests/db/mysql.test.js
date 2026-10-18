import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  describe,
  it,
  expect,
} from 'vitest';
import { freshMysql, mysqlFixtures } from './helpers.js';
import {
  migrateMysql,
  readMigrations,
} from '../../backend/src/repositories/migrationRepository.js';
import { seedMysql } from '../../backend/src/repositories/seedRepository.js';
import { withTransaction } from '../../backend/src/repositories/transaction.js';
let pool, connection, applied;
beforeAll(async () => {
  ({ pool, applied } = await freshMysql());
  await mysqlFixtures(pool);
});
beforeEach(async () => {
  connection = await pool.getConnection();
  await connection.beginTransaction();
});
afterEach(async () => {
  await connection.rollback();
  connection.release();
});
afterAll(async () => {
  if (pool) await pool.end();
});
describe('Real MySQL schema', () => {
  it('applies every migration to an empty database and reruns without changes', async () => {
    expect(applied).toHaveLength(18);
    expect(await migrateMysql(pool, await readMigrations())).toEqual([]);
    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
    );
    expect(row.total).toBe(13); // 11 domain tables, sessions and the migration ledger.
  });
  it('seeds repeatedly without overwriting company data or duplicating postings', async () => {
    await pool.execute(
      "UPDATE companies SET description = 'Keep local edits' WHERE name = 'Example Campus Labs'",
    );
    await seedMysql(pool);
    await seedMysql(pool);
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS total FROM job_postings',
    );
    expect(row.total).toBe(1);
    const [[company]] = await pool.query(
      "SELECT description FROM companies WHERE name = 'Example Campus Labs'",
    );
    expect(company.description).toBe('Keep local edits');
  });
  it('rejects changes to applied migration content', async () => {
    const migrations = await readMigrations();
    migrations[0] = { ...migrations[0], checksum: '0'.repeat(64) };
    await expect(migrateMysql(pool, migrations)).rejects.toThrow('checksum');
  });
  it('fails closed when DDL is marked started rather than silently retrying', async () => {
    await pool.execute(
      "INSERT INTO schema_migrations (name, checksum, state) VALUES ('9999_interrupted.sql', ?, 'started')",
      ['0'.repeat(64)],
    );
    try {
      await expect(migrateMysql(pool, await readMigrations())).rejects.toThrow(
        'Incomplete DDL',
      );
    } finally {
      await pool.execute(
        "DELETE FROM schema_migrations WHERE name = '9999_interrupted.sql'",
      );
    }
  });
  it('enforces primary and unique keys', async () => {
    await expect(
      connection.execute(
        "INSERT INTO branches (id, code, name) VALUES (1, 'NEW', 'New')",
      ),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(
      connection.execute(
        "INSERT INTO users (email, password_hash, role) VALUES ('student-test@example.edu', 'test-only', 'student')",
      ),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(
      connection.execute(
        "INSERT INTO students (user_id, enrollment_number) VALUES (3, 'TEST-001')",
      ),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });
  it('enforces required values and fixed vocabularies', async () => {
    await expect(
      connection.execute('INSERT INTO companies (name) VALUES (NULL)'),
    ).rejects.toMatchObject({ code: 'ER_BAD_NULL_ERROR' });
    await expect(
      connection.execute(
        "INSERT INTO users (email, password_hash, role) VALUES ('invalid-test@example.edu', 'test-only', 'superadmin')",
      ),
    ).rejects.toMatchObject({ code: 'WARN_DATA_TRUNCATED' });
    await expect(
      connection.execute(
        "INSERT INTO branches (code, name) VALUES ('   ', 'Invalid branch')",
      ),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  });
  it('enforces academic CHECK bounds and student-semester uniqueness', async () => {
    for (const [semester, cgpa] of [
      [0, 5],
      [13, 5],
      [3, 10.01],
      [3, -0.01],
    ])
      await expect(
        connection.execute(
          'INSERT INTO academic_records (student_id, semester, sgpa, cgpa) VALUES (1, ?, 8, ?)',
          [semester, cgpa],
        ),
      ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(
      connection.execute(
        'INSERT INTO academic_records (student_id, semester, sgpa, cgpa) VALUES (1, 2, 8, 8)',
      ),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });
  it('enforces nonnegative salary, valid eligibility and graduation year', async () => {
    await expect(
      connection.execute('UPDATE job_postings SET ctc_lpa = -1 WHERE id = 1'),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(
      connection.execute(
        'UPDATE placement_drives SET min_cgpa = 11 WHERE id = 1',
      ),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(
      connection.execute(
        'UPDATE students SET graduation_year = 1500 WHERE id = 1',
      ),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  });
  it('rejects orphan rows at the database boundary', async () => {
    await expect(
      connection.execute(
        'INSERT INTO academic_records (student_id, semester, sgpa, cgpa) VALUES (99999, 1, 8, 8)',
      ),
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
    await expect(
      connection.execute(
        'INSERT INTO student_applications (drive_id, student_id) VALUES (99999, 1)',
      ),
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
    await expect(
      connection.execute('UPDATE admins SET user_id = 99999 WHERE id = 1'),
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });
  it('restricts deletes of referenced master records', async () => {
    await expect(
      connection.execute('DELETE FROM companies WHERE id = 1'),
    ).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
    await expect(
      connection.execute('DELETE FROM users WHERE id = 2'),
    ).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
  });
  it('cascades only owned academic/eligibility children', async () => {
    await connection.execute('DELETE FROM students WHERE id = 1');
    const [[academic]] = await connection.execute(
      'SELECT COUNT(*) AS total FROM academic_records WHERE student_id = 1',
    );
    expect(academic.total).toBe(0);
    await connection.execute('DELETE FROM placement_drives WHERE id = 1');
    const [[branches]] = await connection.execute(
      'SELECT COUNT(*) AS total FROM drive_eligible_branches WHERE drive_id = 1',
    );
    expect(branches.total).toBe(0);
  });
  it('enforces duplicate-application protection (BR-04) and delete protection (BR-12)', async () => {
    const [insert] = await connection.execute(
      'INSERT INTO student_applications (drive_id, student_id) VALUES (1, 1)',
    );
    await expect(
      connection.execute(
        'INSERT INTO student_applications (drive_id, student_id) VALUES (1, 1)',
      ),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await connection.execute(
      "INSERT INTO application_status_history (application_id, to_status, changed_by) VALUES (?, 'applied', 2)",
      [insert.insertId],
    );
    await expect(
      connection.execute(
        'DELETE FROM application_status_history WHERE application_id = ?',
        [insert.insertId],
      ),
    ).rejects.toMatchObject({ sqlState: '45000' });
    await expect(
      connection.execute('DELETE FROM student_applications WHERE id = ?', [
        insert.insertId,
      ]),
    ).rejects.toMatchObject({ sqlState: '45000' });
    await expect(
      connection.execute('DELETE FROM placement_drives WHERE id = 1'),
    ).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
  });
  it('rolls back an application when its history insert fails', async () => {
    await expect(
      withTransaction(pool, async (tx) => {
        const [application] = await tx.execute(
          'INSERT INTO student_applications (drive_id, student_id) VALUES (1, 1)',
        );
        await tx.execute(
          "INSERT INTO application_status_history (application_id, to_status, changed_by) VALUES (?, 'applied', 99999)",
          [application.insertId],
        );
      }),
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
    const [[row]] = await connection.query(
      'SELECT COUNT(*) AS total FROM student_applications WHERE student_id = 1',
    );
    expect(row.total).toBe(0);
  });
  it('commits a complete multi-table transaction and computes views correctly', async () => {
    await withTransaction(pool, async (tx) => {
      const [application] = await tx.execute(
        "INSERT INTO student_applications (drive_id, student_id, status) VALUES (1, 2, 'selected')",
      );
      await tx.execute(
        "INSERT INTO application_status_history (application_id, to_status, changed_by) VALUES (?, 'selected', 1)",
        [application.insertId],
      );
    });
    const [[overview]] = await connection.query(
      'SELECT company_name FROM v_drive_overview WHERE id = 1',
    );
    expect(overview.company_name).toBe('Example Campus Labs');
    const [[summary]] = await connection.query(
      'SELECT semester, cgpa FROM v_student_academic_summary WHERE student_id = 1',
    );
    expect(summary).toMatchObject({ semester: 2, cgpa: 8 });
    const [[details]] = await connection.query(
      'SELECT status, company_name FROM v_application_details WHERE student_id = 2',
    );
    expect(details.status).toBe('selected');
    const [[stats]] = await connection.query(
      "SELECT student_count, selected_student_count FROM v_placement_stats_by_branch WHERE branch_code = 'CSE'",
    );
    expect(stats).toMatchObject({
      student_count: 1,
      selected_student_count: 0,
    });
  });
  it('sets SQL and driver timestamps to UTC and exposes all required indexes', async () => {
    const [[time]] = await connection.query(
      'SELECT @@session.time_zone AS timezone',
    );
    expect(time.timezone).toBe('+00:00');
    const [indexes] = await connection.query(
      'SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE()',
    );
    expect(indexes.map((row) => row.INDEX_NAME || row.index_name)).toEqual(
      expect.arrayContaining([
        'idx_drives_status_deadline',
        'idx_applications_student_status',
        'idx_applications_drive_status',
        'idx_job_postings_company',
        'idx_students_branch_year',
        'idx_history_application_changed',
      ]),
    );
  });
  it('allows only one of two concurrent duplicate application inserts (BR-04)', async () => {
    const results = await Promise.allSettled([
      pool.execute(
        'INSERT INTO student_applications (drive_id, student_id) VALUES (1, 1)',
      ),
      pool.execute(
        'INSERT INTO student_applications (drive_id, student_id) VALUES (1, 1)',
      ),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected').reason.code,
    ).toBe('ER_DUP_ENTRY');
  });
});
