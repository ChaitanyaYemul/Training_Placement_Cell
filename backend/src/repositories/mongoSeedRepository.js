import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { recruitmentProcessModel } from '../models/mongodb/recruitmentProcessModel.js';
import { announcementModel } from '../models/mongodb/announcementModel.js';
import {
  recruitmentSample,
  announcementSample,
} from '../../../database/mongodb/seed/sampleDocuments.js';
export async function seedMongoDocuments(connection, { driveId, authorId }) {
  const Recruitment = recruitmentProcessModel(connection);
  const Announcement = announcementModel(connection);
  const process = new Recruitment(recruitmentSample(driveId, authorId));
  await process.validate();
  process.createdAt = process.updatedAt = new Date('2030-01-01T00:00:00Z');
  const processData = process.toObject();
  delete processData._id;
  // Preserve existing recruitment information and use its unique drive index for retries.
  await Recruitment.collection.updateOne(
    { placementDriveId: driveId },
    { $setOnInsert: processData },
    { upsert: true },
  );
  const announcement = new Announcement(announcementSample(driveId, authorId));
  await announcement.validate();
  announcement.createdAt = announcement.updatedAt = new Date(
    '2030-01-01T00:00:00Z',
  );
  announcement._id = new mongoose.Types.ObjectId(
    createHash('sha256')
      .update(`sample:${driveId}:${authorId}`)
      .digest('hex')
      .slice(0, 24),
  );
  const data = announcement.toObject();
  await Announcement.collection.updateOne(
    { _id: announcement._id },
    { $setOnInsert: data },
    { upsert: true },
  );
}
