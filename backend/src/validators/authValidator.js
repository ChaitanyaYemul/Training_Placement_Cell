import { z } from 'zod';
export const email = z.email().max(254).trim().toLowerCase();
export const password = z.string().min(8).max(1024);
const empty = z.object({}).strict();
export const registerBody = z
  .object({
    email,
    password,
    fullName: z.string().trim().min(1).max(120).optional(),
    role: z.unknown().optional(),
  })
  .strict()
  .transform(({ email, password, fullName }) => ({
    email,
    password,
    fullName,
  }));
export const adminBody = z
  .object({ email, password, fullName: z.string().trim().min(1).max(120) })
  .strict();
export const registration = z.object({
  body: registerBody,
  params: empty,
  query: empty,
});
export const login = z.object({
  body: z.object({ email, password }).strict(),
  params: empty,
  query: empty,
});
