import { AppError } from '../utils/AppError.js';
import { withTransaction } from '../repositories/transaction.js';
export function mustExist(value) {
  if (!value) throw new AppError('NOT_FOUND', 404, 'Record not found');
  return value;
}
export function catalogService({ pool, companies, postings, students }) {
  async function visibleCompany(id, user) {
    const row = mustExist(await companies.get(id));
    if (user.role === 'student' && !row.isActive)
      throw new AppError('NOT_FOUND', 404, 'Record not found');
    return row;
  }
  return {
    companies: {
      list: (user, query) => companies.listVisible(user, query),
      get: visibleCompany,
      async create(body) {
        return companies.get(await companies.insert(body));
      },
      async patch(id, body) {
        mustExist(await companies.get(id));
        await companies.patch(id, body);
        return companies.get(id);
      },
      async remove(id) {
        mustExist(await companies.get(id));
        await companies.remove(id);
      },
    },
    postings: {
      async list(user, companyId, query) {
        await visibleCompany(companyId, user);
        return postings.listVisible(user, companyId, query);
      },
      async get(id, user) {
        const row = mustExist(await postings.get(id));
        await visibleCompany(row.companyId, user);
        if (user.role === 'student')
          mustExist(
            (
              await postings.listVisible(
                user,
                row.companyId,
                { page: 1, limit: 1, sort: 'id' },
                id,
              )
            ).data[0],
          );
        return row;
      },
      async create(companyId, body) {
        mustExist(await companies.get(companyId));
        return postings.get(await postings.insert({ ...body, companyId }));
      },
      async patch(id, body) {
        mustExist(await postings.get(id));
        await postings.patch(id, body);
        return postings.get(id);
      },
      async remove(id) {
        mustExist(await postings.get(id));
        await postings.remove(id);
      },
    },
    profile: {
      async get(user) {
        return mustExist(await students.profile(user.studentId));
      },
      async patch(user, body) {
        mustExist(await students.profile(user.studentId));
        await students.patch(user.studentId, body);
        return students.profile(user.studentId);
      },
      async records(user) {
        return students.records(user.studentId);
      },
      async replace(user, body) {
        await withTransaction(pool, (tx) =>
          students.replaceRecords(tx, user.studentId, body.records),
        );
        return students.records(user.studentId);
      },
    },
    branches: () => students.branches(),
  };
}
