import { describe, it, expect } from 'vitest';
import {
  pool,
  mongo,
  admin,
  roundBody,
  makeApp,
  login,
  write,
  createDrive,
  publish,
} from './helpers.js';
import { recruitmentRepository } from '../../backend/src/repositories/recruitmentRepository.js';
import { AppError } from '../../backend/src/utils/AppError.js';
describe('Business API: recruitment', () => {
  it('BR-06: validates recruitment bodies, returns schedules, detects conflicts and makes identical PUT retries idempotent', async () => {
    const drive = await createDrive();
    const saved = await write(
      admin,
      'put',
      `/placement-drives/${drive.id}/rounds`,
      roundBody(),
    );
    expect(saved.status).toBe(200);
    const retry = await write(
      admin,
      'put',
      `/placement-drives/${drive.id}/rounds`,
      roundBody(),
    );
    expect(retry.body.data.version).toBe(saved.body.data.version);
    const invalid = roundBody();
    invalid.rounds[0].roundNumber = 2;
    expect(
      (
        await write(
          admin,
          'put',
          `/placement-drives/${drive.id}/rounds`,
          invalid,
        )
      ).status,
    ).toBe(400);
    const unsafe = roundBody();
    unsafe.additionalRequirements = { nested: { $gt: 1 } };
    expect(
      (
        await write(
          admin,
          'put',
          `/placement-drives/${drive.id}/rounds`,
          unsafe,
        )
      ).status,
    ).toBe(400);
    const changed = {
      ...roundBody(),
      requiredDocuments: ['Resume'],
      version: 0,
    };
    expect(
      (
        await write(
          admin,
          'put',
          `/placement-drives/${drive.id}/rounds`,
          changed,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await write(admin, 'put', `/placement-drives/${drive.id}/rounds`, {
          ...changed,
          requiredDocuments: ['Different'],
          version: 0,
        })
      ).status,
    ).toBe(409);
    const timeline = await admin.agent.get(
      `/api/placement-drives/${drive.id}/rounds`,
    );
    expect(timeline.body.data.rounds[0].scheduledAt).toBe(
      '2030-11-15T09:30:00.000Z',
    );
    await publish(drive);
    expect(
      (
        await write(admin, 'put', `/placement-drives/${drive.id}/rounds`, {
          rounds: [],
          version: 1,
        })
      ).status,
    ).toBe(409);
  });
  it('deletes a draft in MySQL first and removes its Mongo recruitment document', async () => {
    const drive = await createDrive();
    await write(
      admin,
      'put',
      `/placement-drives/${drive.id}/rounds`,
      roundBody(),
    );
    expect(
      (await write(admin, 'delete', `/placement-drives/${drive.id}`)).status,
    ).toBe(200);
    expect(
      (await admin.agent.get('/api/placement-drives/' + drive.id)).status,
    ).toBe(404);
    expect(
      await mongo.db
        .collection('recruitment_processes')
        .countDocuments({ placementDriveId: drive.id }),
    ).toBe(0);
  });
  it('handles a controlled Mongo outage with a valid SQL draft, degraded reads and pending orphan cleanup', async () => {
    const draft = await createDrive(),
      published = await createDrive();
    await publish(published);
    const base = recruitmentRepository(mongo),
      unavailable = () => {
        throw new AppError('SERVICE_UNAVAILABLE', 503, 'Database unavailable');
      };
    const failureApp = makeApp({
      ...base,
      get: unavailable,
      save: unavailable,
      remove: unavailable,
    });
    try {
      const actor = await login('business-admin@example.edu', failureApp);
      expect(
        (
          await write(
            actor,
            'put',
            `/placement-drives/${draft.id}/rounds`,
            roundBody(),
          )
        ).status,
      ).toBe(503);
      expect(
        (
          await write(actor, 'patch', `/placement-drives/${draft.id}/status`, {
            status: 'published',
          })
        ).status,
      ).toBe(503);
      const detail = await actor.agent.get(
        '/api/placement-drives/' + published.id,
      );
      expect(detail.status).toBe(200);
      expect(detail.body.warnings[0].code).toBe('RECRUITMENT_DATA_UNAVAILABLE');
      const [[row]] = await pool.execute(
        'SELECT status FROM placement_drives WHERE id = ?',
        [draft.id],
      );
      expect(row.status).toBe('draft');
      expect(
        (await write(actor, 'delete', `/placement-drives/${draft.id}`)).body
          .warnings[0].code,
      ).toBe('RECRUITMENT_CLEANUP_PENDING');
    } finally {
      await failureApp.locals.closeSessions();
    }
  });
});
