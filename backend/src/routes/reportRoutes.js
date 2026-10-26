import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authorization.js';
import { validate } from '../middleware/validate.js';
import { requestSchema } from '../validators/businessValidator.js';
import { REPORT_NAMES, reportQuery } from '../validators/reportValidator.js';
import { reportController } from '../controllers/reportController.js';

export function reportRoutes(service, auth) {
  const router = Router();
  router.use(requireAuth(auth), requireRole('admin'));
  for (const name of REPORT_NAMES)
    router.get(
      `/${name}`,
      validate(requestSchema(undefined, undefined, reportQuery)),
      reportController(service, name),
    );
  return router;
}
