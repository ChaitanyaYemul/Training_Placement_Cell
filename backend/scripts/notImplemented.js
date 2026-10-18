import { logger } from '../src/config/logger.js';
logger.error(
  'This command is reserved for a later phase. No database or account changes were performed.',
);
process.exitCode = 1;
