import { withTransaction } from '../repositories/transaction.js';
import { mustExist } from './catalogService.js';
import { AppError } from '../utils/AppError.js';
const adminTransitions = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['selected', 'rejected'],
  selected: [],
  rejected: [],
  withdrawn: [],
};
const studentTransitions = {
  applied: ['withdrawn'],
  shortlisted: ['withdrawn'],
  selected: [],
  rejected: [],
  withdrawn: [],
};
export function applicationStatusService(pool, repository) {
  return {
    detail: async (id, user) =>
      mustExist(
        await repository.detail(
          id,
          user.role === 'student' ? user.studentId : undefined,
        ),
      ),
    async withdraw(id, user) {
      await withTransaction(pool, async (tx) => {
        const row = mustExist(await repository.lock(tx, id, user.studentId));
        if (!studentTransitions[row.status].includes('withdrawn'))
          throw new AppError(
            'INVALID_STATUS_TRANSITION',
            409,
            'Only applied or shortlisted applications can be withdrawn. Withdrawal is final.',
          );
        await repository.status(tx, row, 'withdrawn', user.id);
      });
      return repository.detail(id, user.studentId);
    },
    list: (user, query) =>
      repository.list(
        query,
        user.role === 'student' ? user.studentId : undefined,
      ),
    async change(id, user, { status, remarks }) {
      return withTransaction(pool, async (tx) => {
        const row = mustExist(await repository.lock(tx, id));
        if (!adminTransitions[row.status].includes(status))
          throw new AppError(
            'INVALID_STATUS_TRANSITION',
            409,
            'Invalid application status transition (BR-09)',
          );
        await repository.status(tx, row, status, user.id, remarks);
        return { ...row, status };
      });
    },
  };
}
