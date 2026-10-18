import pino from 'pino';
export const logger = pino({
  redact: {
    paths: [
      'password',
      'passwordHash',
      'email',
      'phone',
      'cgpa',
      'cookie',
      'authorization',
      'csrfToken',
      'sessionId',
      'req.headers',
      'req.body',
    ],
    censor: '[REDACTED]',
  },
});
