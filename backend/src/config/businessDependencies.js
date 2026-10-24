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
export function businessDependencies(
  pool,
  mongo,
  settings,
  { recruitment } = {},
) {
  const repositories = {
    pool,
    ...catalogRepositories(pool),
    students: studentRepository(pool),
    drives: driveRepository(pool),
    recruitment: recruitment || recruitmentRepository(mongo),
    announcements: announcementRepository(mongo),
    applications: applicationRepository(pool),
  };
  const services = {
    catalog: catalogService(repositories),
    drives: driveService(repositories),
    announcements: announcementService(repositories),
    applications: {
      ...applicationStatusService(pool, repositories.applications),
      ...studentApplicationService(repositories),
    },
  };
  return (app, auth) =>
    app.use('/api', businessRoutes(services, auth, settings));
}
