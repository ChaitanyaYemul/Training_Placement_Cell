import { AppError } from '../utils/AppError.js';
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (!result.success)
      return next(
        new AppError(
          'VALIDATION_ERROR',
          400,
          'Invalid request',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
      );
    req.validated = result.data;
    next();
  };
}
