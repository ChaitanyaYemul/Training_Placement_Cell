import { z } from 'zod';
import { pageQuery } from './businessValidator.js';
const query = (keys, sorts, statuses) =>
  pageQuery
    .pick(
      Object.fromEntries(
        ['page', 'limit', 'q', ...keys].map((key) => [key, true]),
      ),
    )
    .extend({
      sort: z.enum(sorts).default(sorts[0]),
      ...(statuses ? { status: z.enum(statuses).optional() } : {}),
    });
export const companiesQuery = query(
  ['isActive'],
  ['-createdAt', 'createdAt', 'name', '-name', 'id', '-id'],
);
export const postingsQuery = query(
  ['isActive'],
  ['-createdAt', 'createdAt', 'id', '-id'],
);
export const drivesQuery = query(
  ['companyId', 'branchId'],
  [
    '-createdAt',
    'createdAt',
    'registrationDeadline',
    '-registrationDeadline',
    'id',
    '-id',
  ],
  ['draft', 'published', 'completed', 'cancelled', 'archived'],
);
export const announcementsQuery = query(
  [],
  ['-createdAt', 'createdAt'],
  ['draft', 'published'],
);
export const applicationsQuery = query(
  [],
  ['-id', 'id'],
  ['applied', 'shortlisted', 'selected', 'rejected', 'withdrawn'],
).omit({ q: true });
