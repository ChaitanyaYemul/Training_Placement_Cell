import { z } from 'zod';
import { safeFlexible } from '../models/mongodb/schemaHelpers.js';
import {
  ROUND_TYPES,
  MODES,
} from '../../../database/mongodb/schemas/definitions.js';
export const id = z.coerce.number().int().positive().max(4294967295);
const integer = z.number().int().nonnegative().max(65535);
const text = (max) => z.string().trim().min(1).max(max);
const decimal = (max) =>
  z
    .number()
    .min(0)
    .max(max)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-8,
      'Use at most two decimals',
    );
const url = z
  .url()
  .max(2048)
  .refine(
    (value) =>
      URL.canParse(value) &&
      ['http:', 'https:'].includes(new URL(value).protocol),
  );
const date = z.iso.datetime();
const sqlDate = date.refine(
  (value) => !value.includes('.') || /\.0+Z$/.test(value),
  'MySQL timestamps use whole seconds',
);
const empty = z.object({}).strict();
const unique = (items) => new Set(items).size === items.length;
const ids = z
  .array(z.number().int().positive().max(4294967295))
  .max(100)
  .refine(unique, 'Ids must be unique');
const optionalText = (max) => text(max).nullable().optional();
export const companyBody = z
  .object({
    name: text(160),
    industry: optionalText(120),
    website: url.nullable().optional(),
    description: optionalText(10000),
    headquarters: optionalText(160),
    contactEmail: z.email().max(254).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export const postingBody = z
  .object({
    title: text(160),
    description: text(10000),
    jobType: z.enum(['full_time', 'internship', 'internship_ppo']),
    ctcLpa: decimal(999999).nullable().optional(),
    location: optionalText(160),
    isActive: z.boolean().optional(),
  })
  .strict();
export const profileBody = z
  .object({
    fullName: text(120).optional(),
    enrollmentNumber: text(40).optional(),
    phone: optionalText(30),
    branchId: z.number().int().positive().max(4294967295).nullable().optional(),
    graduationYear: z.number().int().min(2000).max(2200).nullable().optional(),
  })
  .strict();
export const academicBody = z
  .object({
    records: z
      .array(
        z
          .object({
            semester: z.number().int().min(1).max(12),
            sgpa: decimal(10),
            cgpa: decimal(10),
            activeBacklogs: integer,
          })
          .strict(),
      )
      .max(12)
      .refine(
        (rows) => unique(rows.map((row) => row.semester)),
        'Semesters must be unique',
      ),
  })
  .strict();
export const driveBody = z
  .object({
    jobPostingId: z.number().int().positive().max(4294967295),
    title: text(160),
    description: optionalText(10000),
    registrationDeadline: sqlDate,
    driveDate: sqlDate.nullable().optional(),
    minCgpa: decimal(10).nullable().optional(),
    maxActiveBacklogs: integer.nullable().optional(),
    eligibleGraduationYear: z
      .number()
      .int()
      .min(2000)
      .max(2200)
      .nullable()
      .optional(),
    eligibleBranchIds: ids.optional(),
  })
  .strict();
const flexible = z
  .record(z.string(), z.unknown())
  .refine(safeFlexible, 'Invalid or unsafe flexible fields');
export const roundsBody = z
  .object({
    rounds: z
      .array(
        z
          .object({
            roundNumber: z.number().int().min(1).max(20),
            roundName: text(120),
            roundType: z.enum(ROUND_TYPES),
            description: z.string().max(2000).default(''),
            mode: z.enum(MODES),
            scheduledAt: date.nullable().default(null),
            details: flexible.default({}),
          })
          .strict(),
      )
      .max(20)
      .refine(
        (rounds) =>
          rounds.every(
            (round, index) =>
              round.roundNumber === index + 1 &&
              (!index ||
                !round.scheduledAt ||
                !rounds[index - 1].scheduledAt ||
                Date.parse(round.scheduledAt) >=
                  Date.parse(rounds[index - 1].scheduledAt)),
          ),
        'BR-06: rounds/schedules must be ordered and contiguous',
      ),
    requiredDocuments: z.array(text(120)).max(30).refine(unique).default([]),
    additionalRequirements: flexible.default({}),
    version: z.number().int().nonnegative().optional(),
  })
  .strict();
export const announcementBody = z
  .object({
    title: text(160),
    body: text(10000),
    status: z.enum(['draft', 'published']).optional(),
    priority: z.enum(['normal', 'important', 'urgent']).optional(),
    audience: z
      .object({ type: z.enum(['all', 'branches']), branchIds: ids })
      .strict(),
    relatedDriveId: z
      .number()
      .int()
      .positive()
      .max(4294967295)
      .nullable()
      .optional(),
    links: z
      .array(z.object({ label: text(120), url }).strict())
      .max(10)
      .optional(),
    isPinned: z.boolean().optional(),
    publishedAt: date.nullable().optional(),
    expiresAt: date.nullable().optional(),
  })
  .strict();
export const pageQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    q: z.string().trim().max(100).optional(),
    status: z
      .enum([
        'draft',
        'published',
        'completed',
        'cancelled',
        'archived',
        'applied',
        'shortlisted',
        'selected',
        'rejected',
        'withdrawn',
      ])
      .optional(),
    companyId: id.optional(),
    branchId: id.optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    sort: z
      .enum([
        'name',
        '-name',
        'createdAt',
        '-createdAt',
        'registrationDeadline',
        '-registrationDeadline',
        'id',
        '-id',
      ])
      .default('-createdAt'),
  })
  .strict();
export const partial = (schema) =>
  schema
    .partial()
    .refine(
      (body) => Object.keys(body).length > 0,
      'Provide at least one field',
    );
export const pathId = z.object({ id }).strict();
export const mongoId = z
  .object({ id: z.string().regex(/^[a-fA-F0-9]{24}$/) })
  .strict();
export function requestSchema(
  body = empty.optional(),
  params = empty,
  query = empty,
) {
  return z.object({ body, params, query });
}
