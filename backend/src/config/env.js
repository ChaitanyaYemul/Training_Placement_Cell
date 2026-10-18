import { z } from 'zod';

export const envSchema = z.object({
  SESSION_SECRET: z.string().optional(),
  CSRF_SECRET: z.string().optional(),
  SESSION_MAX_AGE_MS: z.string().optional(),
  TRUST_PROXY_HOPS: z.string().optional(),
  AUTH_RATE_LIMIT: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().optional(),
  MYSQL_HOST: z.string().optional(),
  MYSQL_PORT: z.string().optional(),
  MYSQL_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_DATABASE: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(
      z
        .array(
          z
            .url()
            .refine(
              (value) =>
                URL.canParse(value) &&
                ['http:', 'https:'].includes(new URL(value).protocol) &&
                new URL(value).origin === value,
              'Use origins without paths',
            ),
        )
        .min(1),
    ),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(
    `Invalid environment configuration: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  );
}
export const env = result.data;
