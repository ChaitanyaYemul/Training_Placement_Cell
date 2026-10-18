import {
  companiesQuery,
  postingsQuery,
  drivesQuery,
  announcementsQuery,
  applicationsQuery,
} from '../validators/businessQueries.js';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/authorization.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import { endpoint } from '../controllers/businessController.js';
import {
  companyBody,
  postingBody,
  profileBody,
  academicBody,
  driveBody,
  roundsBody,
  announcementBody,
  partial,
  pathId,
  mongoId,
  requestSchema,
} from '../validators/businessValidator.js';
export function businessRoutes(services, auth, settings) {
  const router = Router(),
    csrf = csrfProtection(settings),
    admin = requireRole('admin'),
    student = requireRole('student');
  router.use(requireAuth(auth));
  const read = (path, action, params, querySchema, options) =>
    router.get(
      path,
      validate(requestSchema(undefined, params, querySchema)),
      endpoint(action, options),
    );
  const write = (method, path, body, params, action, options) =>
    router[method](
      path,
      admin,
      csrf,
      validate(requestSchema(body, params)),
      endpoint(action, options),
    );
  read('/branches', () => services.catalog.branches());
  router.get(
    '/students/me',
    student,
    validate(requestSchema()),
    endpoint((user) => services.catalog.profile.get(user)),
  );
  router.patch(
    '/students/me',
    student,
    csrf,
    validate(requestSchema(partial(profileBody))),
    endpoint((user, _params, body) =>
      services.catalog.profile.patch(user, body),
    ),
  );
  router.get(
    '/students/me/academic-records',
    student,
    validate(requestSchema()),
    endpoint((user) => services.catalog.profile.records(user)),
  );
  router.put(
    '/students/me/academic-records',
    student,
    csrf,
    validate(requestSchema(academicBody)),
    endpoint((user, _params, body) =>
      services.catalog.profile.replace(user, body),
    ),
  );
  read(
    '/companies',
    (user, _params, _body, query) =>
      services.catalog.companies.list(user, query),
    undefined,
    companiesQuery,
    { paginated: true },
  );
  read(
    '/companies/:id',
    (user, { id }) => services.catalog.companies.get(id, user),
    pathId,
  );
  write(
    'post',
    '/companies',
    companyBody,
    undefined,
    (_user, _params, body) => services.catalog.companies.create(body),
    { status: 201 },
  );
  write(
    'patch',
    '/companies/:id',
    partial(companyBody),
    pathId,
    (_user, { id }, body) => services.catalog.companies.patch(id, body),
  );
  write(
    'delete',
    '/companies/:id',
    undefined,
    pathId,
    (_user, { id }) => services.catalog.companies.remove(id),
    { status: 204 },
  );
  read(
    '/companies/:id/job-postings',
    (user, { id }, _body, query) =>
      services.catalog.postings.list(user, id, query),
    pathId,
    postingsQuery,
    { paginated: true },
  );
  read(
    '/job-postings/:id',
    (user, { id }) => services.catalog.postings.get(id, user),
    pathId,
  );
  write(
    'post',
    '/companies/:id/job-postings',
    postingBody,
    pathId,
    (_user, { id }, body) => services.catalog.postings.create(id, body),
    { status: 201 },
  );
  write(
    'patch',
    '/job-postings/:id',
    partial(postingBody),
    pathId,
    (_user, { id }, body) => services.catalog.postings.patch(id, body),
  );
  write(
    'delete',
    '/job-postings/:id',
    undefined,
    pathId,
    (_user, { id }) => services.catalog.postings.remove(id),
    { status: 204 },
  );
  read(
    '/placement-drives',
    (user, _params, _body, query) => services.drives.list(user, query),
    undefined,
    drivesQuery,
    { paginated: true },
  );
  read(
    '/placement-drives/:id',
    (user, { id }) => services.drives.get(id, user),
    pathId,
    undefined,
    { envelope: true },
  );
  write(
    'post',
    '/placement-drives',
    driveBody,
    undefined,
    (user, _params, body) => services.drives.create(user, body),
    { status: 201, envelope: true },
  );
  write(
    'patch',
    '/placement-drives/:id',
    partial(driveBody),
    pathId,
    (user, { id }, body) => services.drives.patch(id, user, body),
    { envelope: true },
  );
  write(
    'patch',
    '/placement-drives/:id/status',
    z
      .object({
        status: z.enum(['published', 'completed', 'cancelled', 'archived']),
      })
      .strict(),
    pathId,
    (user, { id }, body) => services.drives.status(id, user, body.status),
    { envelope: true },
  );
  write(
    'delete',
    '/placement-drives/:id',
    undefined,
    pathId,
    (user, { id }) => services.drives.remove(id, user),
    { envelope: true },
  );
  read(
    '/placement-drives/:id/rounds',
    (user, { id }) => services.drives.rounds(id, user),
    pathId,
  );
  write(
    'put',
    '/placement-drives/:id/rounds',
    roundsBody,
    pathId,
    (user, { id }, body) => services.drives.saveRounds(id, user, body),
  );
  read(
    '/announcements',
    (user, _params, _body, query) => services.announcements.list(user, query),
    undefined,
    announcementsQuery,
    { paginated: true },
  );
  write(
    'post',
    '/announcements',
    announcementBody,
    undefined,
    (user, _params, body) => services.announcements.create(user, body),
    { status: 201 },
  );
  write(
    'patch',
    '/announcements/:id',
    partial(announcementBody),
    mongoId,
    (_user, { id }, body) => services.announcements.patch(id, body),
  );
  write(
    'delete',
    '/announcements/:id',
    undefined,
    mongoId,
    (_user, { id }) => services.announcements.remove(id),
    { status: 204 },
  );
  router.get(
    '/applications/me',
    student,
    validate(requestSchema(undefined, undefined, applicationsQuery)),
    endpoint(
      (user, _params, _body, query) => services.applications.list(user, query),
      { paginated: true },
    ),
  );
  router.get(
    '/admin/applications',
    admin,
    validate(requestSchema(undefined, undefined, applicationsQuery)),
    endpoint(
      (user, _params, _body, query) => services.applications.list(user, query),
      { paginated: true },
    ),
  );
  write(
    'patch',
    '/admin/applications/:id/status',
    z
      .object({
        status: z.enum(['shortlisted', 'selected', 'rejected']),
        remarks: z.string().trim().max(1000).optional(),
      })
      .strict(),
    pathId,
    (user, { id }, body) => services.applications.change(id, user, body),
  );
  return router;
}
