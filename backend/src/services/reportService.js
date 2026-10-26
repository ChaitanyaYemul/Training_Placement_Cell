import { withTransaction } from '../repositories/transaction.js';
import { AppError } from '../utils/AppError.js';
import { mongoUnavailable } from './driveService.js';
import {
  evaluateEligibility,
  missingApplicationProfile,
} from './eligibilityService.js';
import { reportCsv } from './reportCsvService.js';
import { logger } from '../config/logger.js';

export const MAX_REPORT_EXPORT_ROWS = 10000;
const percentage = (part, total) =>
  total ? Math.round((part / total) * 10000) / 100 : 0;

export function reportService({
  pool,
  reports,
  reportEligibility,
  reportRecruitment,
}) {
  async function participation(tx, rows, query) {
    const students = (await reportEligibility.students(tx, query)).filter(
      (student) =>
        missingApplicationProfile({
          ...student,
          academic: student.semester ? student : null,
        }).length === 0,
    );
    const branches = await reportEligibility.branches(
      tx,
      rows.map((row) => row.driveId),
    );
    const applications = await reportEligibility.participants(tx, query);
    const participantIds = new Set(
      applications.map((row) => `${row.driveId}:${row.studentId}`),
    );
    return rows.map((drive) => {
      const eligibleBranches = branches.filter(
        (branch) => branch.driveId === drive.driveId,
      );
      const eligible = students.filter(
        (student) =>
          evaluateEligibility(drive, student, eligibleBranches).eligible,
      );
      const eligibleParticipants = eligible.filter((student) =>
        participantIds.has(`${drive.driveId}:${student.id}`),
      ).length;
      return {
        driveId: drive.driveId,
        title: drive.title,
        eligibleStudents: eligible.length,
        participants: drive.participants,
        eligibleParticipants,
        participationRate: percentage(eligibleParticipants, eligible.length),
      };
    });
  }
  async function overview(query) {
    const { data, ids } = await withTransaction(pool, async (tx) => ({
      data: await reports.overview(tx, query),
      ids: await reports.driveIds(tx, query),
    }));
    data.placementRate = percentage(data.placedStudents, data.students);
    try {
      data.recruitment = await reportRecruitment.summary(ids);
      return { data };
    } catch (error) {
      if (!mongoUnavailable(error)) throw error;
      logger.warn(
        { event: 'report_recruitment_unavailable' },
        'Recruitment report temporarily unavailable',
      );
      return {
        data: { ...data, recruitment: null },
        warnings: [{ code: 'REPORT_RECRUITMENT_UNAVAILABLE' }],
      };
    }
  }
  async function table(name, query) {
    return withTransaction(pool, async (tx) => {
      const exporting = query.format === 'csv';
      const result = await reports.table(
        tx,
        name,
        query,
        exporting ? { limit: MAX_REPORT_EXPORT_ROWS + 1, offset: 0 } : {},
      );
      if (exporting && result.total > MAX_REPORT_EXPORT_ROWS)
        throw new AppError(
          'REPORT_EXPORT_TOO_LARGE',
          413,
          `Exports support up to ${MAX_REPORT_EXPORT_ROWS} rows. Narrow the report filters and try again.`,
        );
      let rows = result.rows;
      if (name === 'branches')
        rows = rows.map((row) => ({
          ...row,
          placementRate: percentage(row.placedStudents, row.students),
        }));
      if (name === 'participation') rows = await participation(tx, rows, query);
      return {
        data: rows,
        meta: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
      };
    });
  }
  return {
    async get(name, query) {
      const result =
        name === 'overview' ? await overview(query) : await table(name, query);
      return query.format === 'csv' ? reportCsv(name, result) : result;
    },
  };
}
