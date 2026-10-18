import { logger } from '../config/logger.js';
import { withTransaction } from '../repositories/transaction.js';
import { evaluateEligibility } from './eligibilityService.js';
import { mustExist } from './catalogService.js';
import { AppError } from '../utils/AppError.js';
export const mongoUnavailable = (error) =>
  [
    'MongoServerSelectionError',
    'MongooseServerSelectionError',
    'MongoNetworkError',
    'MongoNotConnectedError',
    'MongoTopologyClosedError',
  ].includes(error.name) || error.code === 'SERVICE_UNAVAILABLE';
const conflict = (message) => {
  throw new AppError('CONFLICT', 409, message);
};
const transitions = {
  draft: ['published'],
  published: ['completed', 'cancelled'],
  completed: ['archived'],
  cancelled: ['archived'],
  archived: [],
};
export function driveService({
  pool,
  drives,
  postings,
  companies,
  students,
  recruitment,
}) {
  async function visible(id, user, tx, lock = false) {
    const row = mustExist(await drives.get(id, tx, lock));
    if (
      user.role === 'student' &&
      !['published', 'completed', 'cancelled'].includes(row.status)
    )
      throw new AppError('NOT_FOUND', 404, 'Drive not found');
    return row;
  }
  async function decorate(rows, user) {
    const branches = await drives.branches(rows.map((row) => row.id));
    const academic =
      user.role === 'student' ? await students.summary(user.studentId) : null;
    const applied =
      user.role === 'student' ? await drives.appliedDrives(user.studentId) : [];
    return rows.map((row) => {
      const eligibleBranches = branches
        .filter((branch) => branch.driveId === row.id)
        .map(({ id, code, name }) => ({ id, code, name }));
      return {
        ...row,
        eligibleBranches,
        ...(academic
          ? {
              myEligibility: evaluateEligibility(
                row,
                academic,
                eligibleBranches,
              ),
              hasApplied: applied.includes(row.id),
            }
          : {}),
      };
    });
  }
  return {
    async list(user, query) {
      const result = await drives.listVisible(user, query);
      return { ...result, data: await decorate(result.data, user) };
    },
    async get(id, user) {
      const [row] = await decorate([await visible(id, user)], user);
      try {
        const process = await recruitment.get(id);
        if (!process && row.status === 'published')
          logger.warn(
            { driveId: id, event: 'recruitment_missing' },
            'Published drive has no recruitment document',
          );
        return {
          data: { ...row, recruitment: process },
          ...(!process && row.status === 'published'
            ? { warnings: [{ code: 'RECRUITMENT_DATA_MISSING' }] }
            : {}),
        };
      } catch (error) {
        if (!mongoUnavailable(error)) throw error;
        return {
          data: { ...row, recruitment: null },
          warnings: [{ code: 'RECRUITMENT_DATA_UNAVAILABLE' }],
        };
      }
    },
    async create(user, body) {
      const { eligibleBranchIds = [], ...data } = body;
      const id = await withTransaction(pool, async (tx) => {
        mustExist(await postings.get(data.jobPostingId, tx));
        const id = await drives.insert(
          { ...data, createdBy: user.id, status: 'draft' },
          tx,
        );
        await drives.replaceBranches(tx, id, eligibleBranchIds);
        return id;
      });
      return { data: (await decorate([await drives.get(id)], user))[0] };
    },
    async patch(id, user, body) {
      await withTransaction(pool, async (tx) => {
        const row = await visible(id, user, tx, true);
        if (!['draft', 'published'].includes(row.status))
          conflict('Completed, cancelled and archived drives cannot be edited');

        if (body.jobPostingId !== undefined)
          mustExist(await postings.get(body.jobPostingId, tx));
        if (
          row.status === 'published' &&
          body.registrationDeadline &&
          Date.parse(body.registrationDeadline) <
            Date.parse(row.registrationDeadline)
        )
          conflict('Registration deadline may only be extended (BR-14)');
        const hasApplications = await drives.hasApplications(id, tx);
        if (hasApplications) {
          const locked = [
            'minCgpa',
            'maxActiveBacklogs',
            'eligibleGraduationYear',
          ];
          if (
            locked.some(
              (key) => body[key] !== undefined && body[key] !== row[key],
            )
          )
            conflict('Eligibility is locked after applications exist (BR-13)');
          if (body.eligibleBranchIds) {
            const existing = (await drives.branches([id], tx))
              .map((b) => b.id)
              .sort((a, b) => a - b);
            if (
              JSON.stringify(existing) !==
              JSON.stringify([...body.eligibleBranchIds].sort((a, b) => a - b))
            )
              conflict('Eligible branches are locked (BR-13)');
          }
        }
        if (
          row.status === 'published' &&
          ['minCgpa', 'maxActiveBacklogs', 'eligibleGraduationYear'].some(
            (key) => body[key] === null,
          )
        )
          conflict('Published drives require eligibility fields');
        if (row.status === 'published' && body.eligibleBranchIds?.length === 0)
          conflict('Published drives require eligible branches');
        const { eligibleBranchIds, ...data } = body;
        await drives.patch(id, data, tx);
        if (eligibleBranchIds)
          await drives.replaceBranches(tx, id, eligibleBranchIds);
      });
      return this.get(id, user);
    },
    async status(id, user, status) {
      await withTransaction(pool, async (tx) => {
        const row = await visible(id, user, tx, true);
        if (!transitions[row.status].includes(status))
          conflict('Invalid drive status transition');
        if (status === 'published') {
          const posting = mustExist(await postings.get(row.jobPostingId, tx));
          mustExist(await companies.get(posting.companyId, tx));
          const branches = await drives.branches([id], tx);
          if (
            !posting.isActive ||
            !branches.length ||
            ['minCgpa', 'maxActiveBacklogs', 'eligibleGraduationYear'].some(
              (key) => row[key] === null,
            ) ||
            !(await drives.futureDeadline(tx, row.registrationDeadline))
          )
            conflict('Publish preconditions are not satisfied (BR-18)');
          const process = await recruitment.get(id);
          if (!process?.rounds.length)
            conflict('At least one recruitment round is required (BR-18)');
        }
        await drives.patch(id, { status }, tx);
      });
      return this.get(id, user);
    },
    async remove(id, user) {
      await withTransaction(pool, async (tx) => {
        const row = await visible(id, user, tx, true);
        if (row.status !== 'draft' || (await drives.hasApplications(id, tx)))
          conflict('Only draft drives without applications may be deleted');
        await drives.remove(id, tx);
      });
      try {
        await recruitment.remove(id);
      } catch (error) {
        if (!mongoUnavailable(error)) throw error;
        logger.warn(
          { driveId: id, event: 'recruitment_cleanup_pending' },
          'Orphan cleanup requires reconciliation',
        );
        return {
          data: null,
          warnings: [{ code: 'RECRUITMENT_CLEANUP_PENDING' }],
        };
      }
      return { data: null };
    },
    async rounds(id, user) {
      await visible(id, user);
      return recruitment.get(id);
    },
    async saveRounds(id, user, body) {
      return withTransaction(pool, async (tx) => {
        const row = await visible(id, user, tx, true);
        if (!['draft', 'published'].includes(row.status))
          conflict('Recruitment configuration is locked');
        if (row.status === 'published' && !body.rounds.length)
          conflict('Published drives require a recruitment round');
        return recruitment.save(id, body, user.id);
      });
    },
  };
}
