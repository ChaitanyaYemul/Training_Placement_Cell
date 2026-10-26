import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { createMysqlPool } from '../src/config/mysqlPool.js';
import { connectMongo } from '../src/config/mongoConnection.js';
import { logger } from '../src/config/logger.js';
import { reconciliationMysqlRepository } from '../src/repositories/reconciliationMysqlRepository.js';
import { reconciliationMongoRepository } from '../src/repositories/reconciliationMongoRepository.js';
import { reconciliationService } from '../src/services/reconciliationService.js';
import { openReconciliationAudit } from '../src/utils/reconciliationAudit.js';

let pool, mongo, audit;
try {
  const { values } = parseArgs({
    options: {
      fix: { type: 'boolean', default: false },
      'audit-file': { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    logger.info(
      'Usage: npm run reconcile -w backend -- [--fix --audit-file /private/path/audit.jsonl]. Default is read-only. Fix requires a terminal and typed confirmation. Exit: 0 clean, 2 findings, 1 error.',
    );
  } else {
    if (
      values.fix &&
      (!process.stdin.isTTY || !process.stdout.isTTY || !values['audit-file'])
    )
      throw new Error('Fix requires an interactive terminal and --audit-file');
    if (!values.fix && values['audit-file'])
      throw new Error('--audit-file is only accepted with --fix');
    pool = createMysqlPool();
    mongo = await connectMongo();
    const service = reconciliationService({
      pool,
      drives: reconciliationMysqlRepository(pool),
      recruitment: reconciliationMongoRepository(mongo),
    });
    let report = await service.scan();
    logger.info(
      { event: 'reconciliation_scan', report },
      'Cross-database reconciliation report',
    );
    if (values.fix && report.orphans.length) {
      const terminal = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const phrase = `DELETE ${report.orphans.length} ORPHAN RECRUITMENT DOCUMENTS`;
      let answer;
      try {
        answer = await terminal.question(
          `Only the listed orphan documents can be removed. Type "${phrase}" to confirm: `,
        );
      } finally {
        terminal.close();
      }
      if (answer === phrase) {
        audit = await openReconciliationAudit(values['audit-file']);
        const results = await service.fix(report.orphans, {
          confirmed: true,
          audit: audit.write,
        });
        logger.info(
          { event: 'reconciliation_fix', results },
          'Orphan cleanup completed',
        );
        report = await service.scan();
        logger.info(
          { event: 'reconciliation_scan', report },
          'Remaining findings',
        );
      } else {
        logger.info('Confirmation did not match; no documents were changed');
      }
    }
    process.exitCode =
      report.counts.orphans + report.counts.missing + report.counts.empty
        ? 2
        : 0;
  }
} catch {
  logger.error(
    'Reconciliation failed; no further changes attempted. Check arguments, both databases, and the private audit file. A durable delete-intent event may require a read-only rescan after interruption.',
  );
  process.exitCode = 1;
} finally {
  if (audit) await audit.close();
  if (mongo) await mongo.close();
  if (pool) await pool.end();
}
