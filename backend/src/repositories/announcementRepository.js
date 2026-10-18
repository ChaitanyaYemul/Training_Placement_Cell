import { announcementModel } from '../models/mongodb/announcementModel.js';
const dto = (doc) => {
  if (!doc) return null;
  const { _id, __v, ...data } = doc;
  return { ...data, id: _id.toString(), version: __v || 0 };
};
export function announcementRepository(connection) {
  const Model = announcementModel(connection);
  function visibility(user, branchId) {
    return user.role === 'admin'
      ? {}
      : {
          $and: [
            { status: 'published', publishedAt: { $lte: new Date() } },
            { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
            {
              $or: [
                { 'audience.type': 'all' },
                {
                  'audience.type': 'branches',
                  'audience.branchIds': branchId || -1,
                },
              ],
            },
          ],
        };
  }
  return {
    async list(user, branchId, query) {
      const filter = visibility(user, branchId);
      const conditions = [filter];
      if (query.status) conditions.push({ status: query.status });
      if (query.q)
        conditions.push({
          title: {
            $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            $options: 'i',
          },
        });
      const where = { $and: conditions };
      const total = await Model.countDocuments(where);
      const rows = await Model.find(where)
        .sort({ createdAt: query.sort === 'createdAt' ? 1 : -1, _id: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean();
      return {
        data: rows.map(dto),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    },
    async get(id) {
      return dto(await Model.findById(id).lean());
    },
    async save(body, id) {
      if (!id) return dto((await Model.create(body)).toObject());
      const doc = await Model.findById(id);
      if (!doc) return null;
      doc.set(body);
      await doc.save();
      return dto(doc.toObject());
    },
    async remove(id) {
      await Model.deleteOne({ _id: id });
    },
  };
}
