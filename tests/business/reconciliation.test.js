import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  freshMongo,
  freshMysql,
  mysqlFixtures,
  validRecruitment,
} from '../db/helpers.js';
import { applyMongoSchemas } from '../../backend/src/repositories/mongoSchemaRepository.js';
import { reconciliationMysqlRepository } from '../../backend/src/repositories/reconciliationMysqlRepository.js';
import { reconciliationMongoRepository } from '../../backend/src/repositories/reconciliationMongoRepository.js';
import { reconciliationService } from '../../backend/src/services/reconciliationService.js';

let pool, mongo, service, drives, recruitment;
beforeAll(async () => {
  ({ pool } = await freshMysql());
  await mysqlFixtures(pool);
  mongo = await freshMongo();
  await applyMongoSchemas(mongo);
  drives = reconciliationMysqlRepository(pool);
  recruitment = reconciliationMongoRepository(mongo);
  service = reconciliationService({ pool, drives, recruitment });
});
afterAll(async () => {
  if (mongo) await mongo.close();
  if (pool) await pool.end();
});
const processes = () => mongo.db.collection('recruitment_processes');
const orphan = async (id) => {
  await processes().insertOne({ ...validRecruitment(), placementDriveId: id });
  return (await service.scan()).orphans.find(
    ({ placementDriveId }) => placementDriveId === id,
  );
};
const createDrive = async (id, status = 'draft') => {
  await pool.execute(
    `INSERT INTO placement_drives (id,job_posting_id,title,status,registration_deadline,created_by)
     VALUES (?,1,?,?,?,1)`,
    [id, 'Reconciliation test drive', status, '2030-11-01 00:00:00'],
  );
};

describe('Cross-database reconciliation (AGENTS §7.5)', () => {
  it('reports orphans and published missing/empty processes without changing either database', async () => {
    await createDrive(2, 'published');
    await createDrive(3, 'published');
    await createDrive(4, 'published');
    await processes().insertMany([
      { ...validRecruitment(), placementDriveId: 3, rounds: [] },
      { ...validRecruitment(), placementDriveId: 4 },
    ]);
    await orphan(100);
    const before = await processes().find({}).toArray();
    const report = await service.scan();
    expect(report.counts).toEqual({
      drives: 4,
      processes: 3,
      orphans: 1,
      missing: 1,
      empty: 1,
    });
    expect(report.orphans[0].placementDriveId).toBe(100);
    expect(report.missing).toEqual([{ placementDriveId: 2 }]);
    expect(report.empty).toEqual([{ placementDriveId: 3 }]);
    expect(await service.scan()).toEqual(report);
    expect(await processes().find({}).toArray()).toEqual(before);
  });

  it('requires confirmation and durable audit before deleting; records only orphan changes and is idempotent', async () => {
    const snapshot = await orphan(101);
    await expect(service.fix([snapshot])).rejects.toThrow('confirmation');
    await expect(service.fix([snapshot], { confirmed: true })).rejects.toThrow(
      'audit',
    );
    await expect(
      service.fix([snapshot], {
        confirmed: true,
        audit: async () => {
          throw new Error('Disk full');
        },
      }),
    ).rejects.toThrow('Disk full');
    expect(await processes().countDocuments({ placementDriveId: 101 })).toBe(1);
    const events = [];
    const options = {
      confirmed: true,
      audit: async (event) => events.push(event),
    };
    expect((await service.fix([snapshot], options))[0].status).toBe('removed');
    expect(events.map(({ event }) => event)).toEqual([
      'orphan_delete_intent',
      'orphan_delete_result',
    ]);
    expect(events[1].status).toBe('removed');
    expect(await processes().countDocuments({ placementDriveId: 101 })).toBe(0);
    expect((await service.fix([snapshot], options))[0].status).toBe(
      'changed_or_absent',
    );
    expect(await processes().countDocuments({ placementDriveId: 3 })).toBe(1);
    expect((await service.scan()).missing).toEqual([{ placementDriveId: 2 }]);
  });

  it('rechecks MySQL after confirmation and preserves a process that is now referenced', async () => {
    const snapshot = await orphan(102);
    await createDrive(102);
    const events = [];
    expect(
      (
        await service.fix([snapshot], {
          confirmed: true,
          audit: async (event) => events.push(event),
        })
      )[0].status,
    ).toBe('referenced');
    expect(await processes().countDocuments({ placementDriveId: 102 })).toBe(1);
    expect(events[0].event).toBe('orphan_cleanup_skipped');
  });

  it('preserves a process concurrently edited after the scan', async () => {
    const snapshot = await orphan(103);
    await processes().updateOne(
      { placementDriveId: 103 },
      { $inc: { __v: 1 }, $set: { requiredDocuments: ['Updated checklist'] } },
    );
    const results = await service.fix([snapshot], {
      confirmed: true,
      audit: async () => {},
    });
    expect(results[0].status).toBe('changed_or_absent');
    expect(
      (await processes().findOne({ placementDriveId: 103 })).requiredDocuments,
    ).toEqual(['Updated checklist']);
  });

  it('fails closed when a database read or reference recheck fails', async () => {
    const unavailable = async () => {
      throw new Error('Database unavailable');
    };
    const broken = reconciliationService({
      pool,
      drives: { ...drives, drives: unavailable, lockReference: unavailable },
      recruitment,
    });
    await expect(broken.scan()).rejects.toThrow('Database unavailable');
    const snapshot = await orphan(104);
    await expect(
      broken.fix([snapshot], { confirmed: true, audit: async () => {} }),
    ).rejects.toThrow('Database unavailable');
    expect(await processes().countDocuments({ placementDriveId: 104 })).toBe(1);
  });

  it('holds a primary-key gap lock during Mongo cleanup, blocking a concurrent parent insertion', async () => {
    const snapshot = await orphan(105);
    const contender = await pool.getConnection();
    const guarded = reconciliationService({
      pool,
      drives,
      recruitment: {
        ...recruitment,
        async removeUnchanged(value) {
          await contender.query('SET SESSION innodb_lock_wait_timeout = 1');
          await expect(
            contender.execute(
              `INSERT INTO placement_drives (id,job_posting_id,title,registration_deadline,created_by)
           VALUES (?,1,?,?,1)`,
              [105, 'Concurrent parent', '2030-11-01 00:00:00'],
            ),
          ).rejects.toMatchObject({ code: 'ER_LOCK_WAIT_TIMEOUT' });
          return recruitment.removeUnchanged(value);
        },
      },
    });
    try {
      expect(
        (
          await guarded.fix([snapshot], {
            confirmed: true,
            audit: async () => {},
          })
        )[0].status,
      ).toBe('removed');
    } finally {
      await contender.query('SET SESSION innodb_lock_wait_timeout = DEFAULT');
      contender.release();
    }
    await createDrive(105);
    expect((await service.scan()).counts.drives).toBe(6);
  });
});
