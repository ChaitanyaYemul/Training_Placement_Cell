import { z } from 'zod';
import { env } from './env.js';
const secret = z
  .string()
  .min(32)
  .max(1024)
  .refine((value) => !value.startsWith('replace_'));
export const authSettingsSchema = z.object({
  SESSION_SECRET: secret,
  CSRF_SECRET: secret,
  SESSION_MAX_AGE_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(86400000)
    .default(7200000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().max(100).default(10),
});
export function getAuthSettings() {
  const result = authSettingsSchema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Missing/invalid authentication settings: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  return {
    ...result.data,
    secure: env.NODE_ENV === 'production',
    origins: env.CLIENT_ORIGIN,
  };
}
export function getAdminInput() {
  return {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    fullName: env.ADMIN_NAME,
  };
}
