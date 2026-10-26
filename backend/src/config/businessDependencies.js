import { catalogRepositories } from '../repositories/catalogRepository.js';
import { studentRepository } from '../repositories/studentRepository.js';
import { driveRepository } from '../repositories/driveRepository.js';
import { recruitmentRepository } from '../repositories/recruitmentRepository.js';
import { announcementRepository } from '../repositories/announcementRepository.js';
import { applicationRepository } from '../repositories/applicationRepository.js';
import { catalogService } from '../services/catalogService.js';
import { driveService } from '../services/driveService.js';
import { announcementService } from '../services/announcementService.js';
import { applicationStatusService } from '../services/applicationStatusService.js';
import { studentApplicationService } from '../services/studentApplicationService.js';
import { businessRoutes } from '../routes/businessRoutes.js';
import { reportRepository } from '../repositories/reportRepository.js';
import { reportEligibilityRepository } from '../repositories/reportEligibilityRepository.js';
import { reportRecruitmentRepository } from '../repositories/reportRecruitmentRepository.js';
import { reportService } from '../services/reportService.js';
import { reportRoutes } from '../routes/reportRoutes.js';
export function businessDependencies(
  pool,
  mongo,
  settings,
  { recruitment, reportRecruitment } = {},
) {
  const repositories = {
    pool,
    ...catalogRepositories(pool),
    students: studentRepository(pool),
    drives: driveRepository(pool),
    recruitment: recruitment || recruitmentRepository(mongo),
    announcements: announcementRepository(mongo),
    applications: applicationRepository(pool),
    reports: reportRepository(),
    reportEligibility: reportEligibilityRepository(),
    reportRecruitment: reportRecruitment || reportRecruitmentRepository(mongo),
  };
  const services = {
    catalog: catalogService(repositories),
    drives: driveService(repositories),
    announcements: announcementService(repositories),
    applications: {
      ...applicationStatusService(pool, repositories.applications),
      ...studentApplicationService(repositories),
    },
    reports: reportService(repositories),
  };
  return (app, auth) => {
    app.use('/api/admin/reports', reportRoutes(services.reports, auth));
    app.use('/api', businessRoutes(services, auth, settings));
  };
}
