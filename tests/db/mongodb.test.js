import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import {
  freshMysql,
  freshMongo,
  mysqlFixtures,
  clearMongo,
  validRecruitment,
  validAnnouncement,
} from './helpers.js';
import { applyMongoSchemas } from '../../backend/src/repositories/mongoSchemaRepository.js';
import { recruitmentProcessModel } from '../../backend/src/models/mongodb/recruitmentProcessModel.js';
import { announcementModel } from '../../backend/src/models/mongodb/announcementModel.js';
import { seedRecruitmentSamples } from '../../backend/src/services/sampleSeedService.js';
let connection, pool, Recruitment, Announcement;
beforeAll(async () => {
  ({ pool } = await freshMysql());
  await mysqlFixtures(pool);
  connection = await freshMongo();
  await applyMongoSchemas(connection);
  Recruitment = recruitmentProcessModel(connection);
  Announcement = announcementModel(connection);
});
beforeEach(async () => {
  await clearMongo(connection);
});
afterAll(async () => {
  if (connection) await connection.close();
  if (pool) await pool.end();
});
describe('Real MongoDB validators and Mongoose models', () => {
  it('applies collection validators/indexes repeatedly without data loss', async () => {
    await Recruitment.create(validRecruitment());
    await applyMongoSchemas(connection);
    expect(await Recruitment.countDocuments()).toBe(1);
    const indexes = await Recruitment.collection.indexes();
    expect(
      indexes.find((index) => index.name === 'uq_recruitment_drive').unique,
    ).toBe(true);
    expect(indexes.some((index) => index.name === 'idx_rounds_schedule')).toBe(
      true,
    );
    expect(
      (await Announcement.collection.indexes()).map((index) => index.name),
    ).toEqual(
      expect.arrayContaining([
        'idx_announcements_status_published',
        'idx_announcements_drive',
      ]),
    );
  });
  it('rejects duplicate drive references with the real unique index', async () => {
    await Recruitment.create(validRecruitment());
    await expect(Recruitment.create(validRecruitment())).rejects.toMatchObject({
      code: 11000,
    });
  });
  it('rejects invalid enums through Mongoose and raw database writes', async () => {
    const data = validRecruitment();
    data.rounds[0].roundType = 'unknown';
    await expect(new Recruitment(data).validate()).rejects.toThrow();
    await expect(Recruitment.collection.insertOne(data)).rejects.toMatchObject({
      code: 121,
    });
  });
  it('requires actual BSON dates and numeric integer cross-database ids', async () => {
    for (const mutate of [
      (data) => {
        data.rounds[0].scheduledAt = '2030-11-15';
      },
      (data) => {
        data.placementDriveId = '1';
      },
      (data) => {
        data.placementDriveId = 1.5;
      },
      (data) => {
        data.placementDriveId = 4294967296;
      },
    ]) {
      const data = validRecruitment();
      mutate(data);
      await expect(
        Recruitment.collection.insertOne(data),
      ).rejects.toMatchObject({ code: 121 });
    }
  });
  it('enforces contiguous round numbers in both layers (BR-06)', async () => {
    for (const numbers of [[2], [1, 1], [1, 3], [2, 1]]) {
      const data = validRecruitment();
      data.rounds = numbers.map((roundNumber) => ({
        ...data.rounds[0],
        roundNumber,
      }));
      await expect(new Recruitment(data).validate()).rejects.toThrow('BR-06');
      await expect(
        Recruitment.collection.insertOne(data),
      ).rejects.toMatchObject({ code: 121 });
    }
  });
  it('rejects reversed consecutive schedules and permits TBD schedules (A-06)', async () => {
    const data = validRecruitment();
    data.rounds.push({
      ...data.rounds[0],
      roundNumber: 2,
      scheduledAt: new Date('2030-01-01T00:00:00Z'),
    });
    await expect(new Recruitment(data).validate()).rejects.toThrow();
    await expect(Recruitment.collection.insertOne(data)).rejects.toMatchObject({
      code: 121,
    });
    data.rounds[1].scheduledAt = null;
    await expect(Recruitment.create(data)).resolves.toBeTruthy();
  });
  it('rejects unsafe nested keys, excess depth and oversized flexible data', async () => {
    for (const additionalRequirements of [
      { nested: { $operator: 'value' } },
      { nested: { 'bad.key': 1 } },
      { nested: { constructor: 'bad' } },
      { a: { b: { c: { d: { e: 1 } } } } },
      { text: 'x'.repeat(2001) },
    ]) {
      const data = { ...validRecruitment(), additionalRequirements };
      await expect(new Recruitment(data).validate()).rejects.toThrow();
      await expect(
        Recruitment.collection.insertOne(data),
      ).rejects.toMatchObject({ code: 121 });
    }
  });
  it('rejects unknown document fields and duplicate or untrimmed checklist strings', async () => {
    await expect(
      Recruitment.collection.insertOne({
        ...validRecruitment(),
        companyName: 'must stay in MySQL',
      }),
    ).rejects.toMatchObject({ code: 121 });
    for (const requiredDocuments of [
      ['Resume', 'Resume'],
      ['  Resume  '],
      [''],
    ]) {
      await expect(
        Recruitment.collection.insertOne({
          ...validRecruitment(),
          requiredDocuments,
        }),
      ).rejects.toMatchObject({ code: 121 });
    }
  });
  it('rejects invalid announcements, unsafe links and invalid audiences', async () => {
    const cases = [
      { priority: 'unknown' },
      { links: [{ label: 'Bad', url: 'javascript:alert(1)' }] },
      { audience: { type: 'branches', branchIds: [] } },
      { audience: { type: 'all', branchIds: [1] } },
      { audience: { type: 'branches', branchIds: [1, 1] } },
      { publishedAt: null },
    ];
    for (const patch of cases) {
      const data = { ...validAnnouncement(), ...patch };
      await expect(new Announcement(data).validate()).rejects.toThrow();
      await expect(
        Announcement.collection.insertOne(data),
      ).rejects.toMatchObject({ code: 121 });
    }
    await Announcement.create(validAnnouncement());
    expect(await Announcement.countDocuments()).toBe(1);
  });
  it('detects optimistic concurrency conflicts on real saved documents', async () => {
    const doc = await Recruitment.create(validRecruitment());
    const a = await Recruitment.findById(doc._id);
    const b = await Recruitment.findById(doc._id);
    a.requiredDocuments = ['Resume'];
    await a.save();
    b.requiredDocuments = ['College ID'];
    await expect(b.save()).rejects.toMatchObject({ name: 'VersionError' });
  });
  it('preserves varied drive-specific fields without duplicating relational master records', async () => {
    await Recruitment.create(validRecruitment());
    await Recruitment.create({
      ...validRecruitment(),
      placementDriveId: 2,
      additionalRequirements: {
        assessment: { languages: ['JavaScript', 'Java'], durationMinutes: 90 },
      },
    });
    const docs = await Recruitment.find(
      {},
      { placementDriveId: 1, additionalRequirements: 1 },
    ).lean();
    expect(docs).toHaveLength(2);
    expect(docs[1].additionalRequirements.assessment.durationMinutes).toBe(90);
  });
  it('seeds samples repeatedly and refuses nonexistent MySQL references', async () => {
    await expect(
      seedRecruitmentSamples(pool, connection, 99999, 1),
    ).rejects.toThrow('existing drive');
    expect(await Recruitment.countDocuments()).toBe(0);
    await seedRecruitmentSamples(pool, connection, 1, 1);
    await seedRecruitmentSamples(pool, connection, 1, 1);
    expect(await Recruitment.countDocuments()).toBe(1);
    expect(await Announcement.countDocuments()).toBe(1);
    const doc = await Recruitment.findOne({ placementDriveId: 1 });
    doc.requiredDocuments = ['Keep existing'];
    await doc.save();
    await seedRecruitmentSamples(pool, connection, 1, 1);
    expect(
      (await Recruitment.findOne({ placementDriveId: 1 }).lean())
        .requiredDocuments,
    ).toEqual(['Keep existing']);
  });
  it('enforces document byte/array limits at both model and database layers', async () => {
    const data = validRecruitment();
    data.additionalRequirements = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`field${i}`, 'x'.repeat(2000)]),
    );
    data.rounds[0].details = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`field${i}`, 'x'.repeat(2000)]),
    );
    await expect(new Recruitment(data).validate()).rejects.toThrow('64 KiB');
    await expect(Recruitment.collection.insertOne(data)).rejects.toMatchObject({
      code: 121,
    });
    data.additionalRequirements = {};
    data.rounds[0].details = {};
    data.rounds = Array.from({ length: 21 }, (_, i) => ({
      ...data.rounds[0],
      roundNumber: i + 1,
    }));
    await expect(new Recruitment(data).validate()).rejects.toThrow();
    await expect(Recruitment.collection.insertOne(data)).rejects.toMatchObject({
      code: 121,
    });
  });
});
