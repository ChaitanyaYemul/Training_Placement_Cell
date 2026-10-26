import { recruitmentProcessModel } from '../models/mongodb/recruitmentProcessModel.js';
import {
  roundTypeDistribution,
  commonDocuments,
} from '../../../database/mongodb/queries/pipelines.js';

/** Mongo aggregates run once for the entire SQL-selected cohort, without N+1 reads. */
export function reportRecruitmentRepository(connection) {
  const Model = recruitmentProcessModel(connection);
  return {
    async summary(driveIds) {
      const [result] = await Model.aggregate([
        { $match: { placementDriveId: { $in: driveIds } } },
        {
          $facet: {
            roundTypes: roundTypeDistribution(),
            requiredDocuments: commonDocuments(),
          },
        },
      ]);
      return {
        roundTypes: result.roundTypes.map(({ _id, count }) => ({
          roundType: _id,
          count,
        })),
        requiredDocuments: result.requiredDocuments.map(({ _id, count }) => ({
          document: _id,
          count,
        })),
      };
    },
  };
}
