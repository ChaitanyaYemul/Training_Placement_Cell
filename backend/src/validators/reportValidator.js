import { z } from 'zod';
import { id } from './businessValidator.js';

export const REPORT_NAMES = [
  'overview',
  'drives',
  'companies',
  'branches',
  'statuses',
  'participation',
];
export const reportQuery = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    driveId: id.optional(),
    companyId: id.optional(),
    branchId: id.optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    format: z.enum(['json', 'csv']).default('json'),
    sort: z.enum(['id', '-id']).default('id'),
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'From date must be on or before to date',
    path: ['to'],
  });
