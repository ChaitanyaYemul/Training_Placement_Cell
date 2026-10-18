// Parameters are typed ids/dates from trusted callers; API request objects must never enter these pipelines.
export const upcomingRounds = (driveIds, from) => [
  { $match: { placementDriveId: { $in: driveIds } } },
  { $unwind: '$rounds' },
  { $match: { 'rounds.scheduledAt': { $gte: from } } },
  { $sort: { 'rounds.scheduledAt': 1, placementDriveId: 1 } },
  {
    $project: {
      _id: 0,
      placementDriveId: 1,
      roundName: '$rounds.roundName',
      scheduledAt: '$rounds.scheduledAt',
    },
  },
];
export const roundTypeDistribution = () => [
  { $unwind: '$rounds' },
  { $group: { _id: '$rounds.roundType', count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
];
export const commonDocuments = () => [
  { $unwind: '$requiredDocuments' },
  { $group: { _id: '$requiredDocuments', count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
];
