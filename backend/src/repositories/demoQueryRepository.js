import { readFile } from 'node:fs/promises';
const names = [
  'published_drives',
  'student_applications',
  'drive_applications',
  'company_postings',
  'branch_cohort',
  'application_history',
  'eligible_students',
  'company_selections',
];
export async function mysqlDemo(pool, name, parameters) {
  if (!names.includes(name)) throw new Error('Unknown demonstration query');
  const sql = await readFile(
    new URL(`../../../database/mysql/queries/${name}.sql`, import.meta.url),
    'utf8',
  );
  const [rows] = await pool.execute(sql, parameters);
  const [plan] = await pool.execute('EXPLAIN ' + sql, parameters);
  return { rows, plan };
}
