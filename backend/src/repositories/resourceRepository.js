// All identifiers originate in this fixed registry, never request keys or raw sort strings.
const registry = {
  companies: {
    name: 'name',
    industry: 'industry',
    website: 'website',
    description: 'description',
    headquarters: 'headquarters',
    contactEmail: 'contact_email',
    isActive: 'is_active',
  },
  job_postings: {
    companyId: 'company_id',
    title: 'title',
    description: 'description',
    jobType: 'job_type',
    ctcLpa: 'ctc_lpa',
    location: 'location',
    isActive: 'is_active',
  },
  placement_drives: {
    jobPostingId: 'job_posting_id',
    title: 'title',
    description: 'description',
    status: 'status',
    registrationDeadline: 'registration_deadline',
    driveDate: 'drive_date',
    minCgpa: 'min_cgpa',
    maxActiveBacklogs: 'max_active_backlogs',
    eligibleGraduationYear: 'eligible_graduation_year',
    createdBy: 'created_by',
  },
};
export function rowDto(row) {
  if (!row) return null;
  const result = { ...row };
  for (const key of [
    'createdAt',
    'updatedAt',
    'registrationDeadline',
    'driveDate',
    'appliedAt',
    'changedAt',
  ])
    if (
      result[key] &&
      typeof result[key] === 'string' &&
      !result[key].endsWith('Z')
    )
      result[key] = result[key].replace(' ', 'T') + 'Z';
  if (result.isActive !== undefined) result.isActive = Boolean(result.isActive);
  return result;
}
export function resourceRepository(pool, table) {
  const fields = {
    id: 'id',
    ...registry[table],
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  if (!registry[table]) throw new Error('Unknown SQL resource');
  const columns = Object.entries(fields)
    .map(([key, column]) => `r.${column} AS ${key}`)
    .join(', ');
  function entries(body) {
    return Object.entries(body)
      .filter(([key]) => key !== 'id' && fields[key])
      .map(([key, value]) => [
        fields[key],
        ['registrationDeadline', 'driveDate'].includes(key) && value
          ? value.replace('T', ' ').replace('Z', '')
          : value,
      ]);
  }
  return {
    async list(query, clauses = [], values = []) {
      clauses = [...clauses];
      values = [...values];
      if (query.q) {
        clauses.push(`r.${table === 'companies' ? 'name' : 'title'} LIKE ?`);
        values.push('%' + query.q + '%');
      }
      const sort = query.sort || '-createdAt',
        key = sort.replace(/^-/, '');
      if (!fields[key]) throw new Error('Unsupported resource sort');
      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      const [[count]] = await pool.execute(
        `SELECT COUNT(*) AS total FROM ${table} AS r${where}`,
        values,
      );
      const [rows] = await pool.query(
        `SELECT ${columns} FROM ${table} AS r${where} ORDER BY r.${fields[key]} ${sort.startsWith('-') ? 'DESC' : 'ASC'}, r.id ASC LIMIT ? OFFSET ?`,
        [...values, query.limit, (query.page - 1) * query.limit],
      );
      return {
        data: rows.map(rowDto),
        meta: {
          page: query.page,
          limit: query.limit,
          total: count.total,
          totalPages: Math.ceil(count.total / query.limit),
        },
      };
    },
    async get(id, tx = pool, lock = false) {
      const [[row]] = await tx.execute(
        `SELECT ${columns} FROM ${table} AS r WHERE r.id = ?${lock ? ' FOR UPDATE' : ''}`,
        [id],
      );
      return rowDto(row);
    },
    async insert(body, tx = pool) {
      const pairs = entries(body);
      const [result] = await tx.execute(
        `INSERT INTO ${table} (${pairs.map(([key]) => key).join(', ')}) VALUES (${pairs.map(() => '?').join(', ')})`,
        pairs.map(([, value]) => value),
      );
      return result.insertId;
    },
    async patch(id, body, tx = pool) {
      const pairs = entries(body);
      if (pairs.length)
        await tx.execute(
          `UPDATE ${table} SET ${pairs.map(([key]) => key + ' = ?').join(', ')} WHERE id = ?`,
          [...pairs.map(([, value]) => value), id],
        );
    },
    async remove(id, tx = pool) {
      await tx.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    },
  };
}
