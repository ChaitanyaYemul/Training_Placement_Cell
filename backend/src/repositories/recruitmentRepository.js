import { isDeepStrictEqual } from 'node:util';
import { recruitmentProcessModel } from '../models/mongodb/recruitmentProcessModel.js';
import { AppError } from '../utils/AppError.js';
const fields = ['rounds', 'requiredDocuments', 'additionalRequirements'];
export const recruitmentDto = (row) =>
  row
    ? {
        placementDriveId: row.placementDriveId,
        rounds: row.rounds,
        requiredDocuments: row.requiredDocuments,
        additionalRequirements: row.additionalRequirements,
        schemaVersion: row.schemaVersion,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        version: row.__v || 0,
      }
    : null;
export function recruitmentRepository(connection) {
  const Model = recruitmentProcessModel(connection);
  return {
    async get(id) {
      return recruitmentDto(
        await Model.findOne({ placementDriveId: id }).lean(),
      );
    },
    async save(id, input, userId) {
      const doc = await Model.findOne({ placementDriveId: id });
      const content = Object.fromEntries(
        fields.map((field) => [field, input[field]]),
      );
      // Repeated identical PUTs preserve the stored document and version, even after a lost response.
      if (
        doc &&
        isDeepStrictEqual(
          JSON.parse(
            JSON.stringify(
              Object.fromEntries(fields.map((field) => [field, doc[field]])),
            ),
          ),
          JSON.parse(JSON.stringify(content)),
        )
      )
        return recruitmentDto(doc.toObject());
      if (doc && input.version !== doc.__v)
        throw new AppError(
          'CONFLICT',
          409,
          'Recruitment process changed; reload before editing',
        );
      if (!doc)
        return recruitmentDto(
          (
            await Model.create({
              ...content,
              placementDriveId: id,
              updatedBy: userId,
            })
          ).toObject(),
        );
      doc.set({ ...content, updatedBy: userId });
      await doc.save();
      return recruitmentDto(doc.toObject());
    },
    async remove(id) {
      await Model.deleteOne({ placementDriveId: id });
    },
  };
}
