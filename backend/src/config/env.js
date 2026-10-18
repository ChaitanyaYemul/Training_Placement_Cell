import { z } from 'zod';

export const envSchema = z.object({
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
