import { z } from 'zod';
import { assertDevelopmentSeed } from '../config/databaseEnv.js';
import { seedReferences } from '../repositories/seedRepository.js';
import { seedMongoDocuments } from '../repositories/mongoSeedRepository.js';
export async function seedRecruitmentSamples(
  pool,
  connection,
  driveId,
  authorId,
) {
  assertDevelopmentSeed();
  const input = z
    .object({
      driveId: z.number().int().positive().max(4294967295),
      authorId: z.number().int().positive().max(4294967295),
    })
    .parse({ driveId, authorId });
  const refs = await seedReferences(pool, input.driveId, input.authorId);
  await seedMongoDocuments(connection, refs);
}
