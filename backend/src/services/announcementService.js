import { mustExist } from './catalogService.js';
import { AppError } from '../utils/AppError.js';
export function announcementService({ announcements, drives, students }) {
  async function references(body) {
    if (body.relatedDriveId) mustExist(await drives.get(body.relatedDriveId));
    if (body.audience?.branchIds.length) {
      const branches = await students.branches();
      if (
        body.audience.branchIds.some(
          (id) => !branches.some((branch) => branch.id === id),
        )
      )
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          'Referenced branch does not exist',
        );
    }
  }
  return {
    async list(user, query) {
      const profile =
        user.role === 'student' ? await students.profile(user.studentId) : null;
      return announcements.list(user, profile?.branchId, query);
    },
    async create(user, body) {
      await references(body);
      return announcements.save({ ...body, createdBy: user.id });
    },
    async patch(id, body) {
      mustExist(await announcements.get(id));
      await references(body);
      return announcements.save(body, id);
    },
    async remove(id) {
      mustExist(await announcements.get(id));
      await announcements.remove(id);
    },
  };
}
