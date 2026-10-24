import { withTransaction } from '../repositories/transaction.js';
import { AppError } from '../utils/AppError.js';
import { mustExist } from './catalogService.js';
import { evaluateEligibility } from './eligibilityService.js';
const duplicate = () =>
  new AppError(
    'DUPLICATE_APPLICATION',
    409,
    'You already applied to this drive. Withdrawn applications cannot be resubmitted.',
  );
const deadline = () =>
  new AppError('DEADLINE_PASSED', 409, 'The registration deadline has passed.');
export function studentApplicationService({
  pool,
  applications,
  drives,
  students,
}) {
  return {
    async apply(driveId, user) {
      try {
        const id = await withTransaction(pool, async (tx) => {
          // Lock order: drive -> student -> latest academic record. Drive lifecycle/eligibility edits serialize here.
          const drive = mustExist(await drives.get(driveId, tx, true));
          if (!['published', 'completed', 'cancelled'].includes(drive.status))
            throw new AppError('NOT_FOUND', 404, 'Drive not found');
          if (await applications.existing(tx, driveId, user.studentId))
            throw duplicate();
          if (drive.status !== 'published')
            throw new AppError(
              'CONFLICT',
              409,
              'This drive is not accepting applications.',
            );
          if (!(await drives.futureDeadline(tx, drive.registrationDeadline)))
            throw deadline();
          const profile = mustExist(
            await students.lockApplicationProfile(tx, user.studentId),
          );
          const missing = [
            'fullName',
            'enrollmentNumber',
            'branchId',
            'graduationYear',
          ].filter(
            (key) =>
              !profile[key] ||
              (typeof profile[key] === 'string' && !profile[key].trim()),
          );
          if (!profile.academic) missing.push('academicRecords');
          if (missing.length)
            throw new AppError(
              'PROFILE_INCOMPLETE',
              409,
              'Complete your profile and academic records before applying.',
              missing.map((field) => ({
                field: `profile.${field}`,
                message: 'Required before applying',
              })),
            );
          const eligibility = evaluateEligibility(
            drive,
            { ...profile, ...profile.academic },
            await drives.branches([driveId], tx),
          );
          if (!eligibility.eligible)
            throw new AppError(
              'NOT_ELIGIBLE',
              400,
              'Your current academic details do not meet this drive’s eligibility criteria.',
              eligibility.failedCriteria.map((field) => ({
                field: `eligibility.${field}`,
                message: 'Criterion not met',
              })),
            );
          const id = await applications.insertOpen(tx, driveId, user.studentId);
          if (!id) throw deadline();
          await applications.initialHistory(tx, id, user.id);
          return id;
        });
        return applications.detail(id, user.studentId);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw duplicate();
        throw error;
      }
    },
  };
}
