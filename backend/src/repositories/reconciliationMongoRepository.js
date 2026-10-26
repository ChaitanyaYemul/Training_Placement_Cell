import mongoose from 'mongoose';

/** Project metadata only; conditional removal protects documents edited after scanning. */
export function reconciliationMongoRepository(connection) {
  const collection = connection.db.collection('recruitment_processes');
  return {
    async processes() {
      const rows = await collection
        .aggregate([
          {
            $project: {
              placementDriveId: 1,
              updatedAt: 1,
              version: { $ifNull: ['$__v', null] },
              roundCount: { $size: { $ifNull: ['$rounds', []] } },
            },
          },
          { $sort: { placementDriveId: 1, _id: 1 } },
        ])
        .toArray();
      return rows.map(({ _id, updatedAt, ...row }) => ({
        ...row,
        documentId: String(_id),
        updatedAt: updatedAt.toISOString(),
      }));
    },
    async removeUnchanged(snapshot) {
      const result = await collection.deleteOne({
        _id: new mongoose.Types.ObjectId(snapshot.documentId),
        placementDriveId: snapshot.placementDriveId,
        __v: snapshot.version,
        updatedAt: new Date(snapshot.updatedAt),
      });
      return result.deletedCount === 1;
    },
  };
}
