import { rowDto } from './resourceRepository.js';
export function applicationRepository(pool) {
  return {
    async list(query, studentId) {
      const clauses = [],
        values = [];
      if (studentId !== undefined) {
        clauses.push('a.student_id = ?');
        values.push(studentId);
      }
      if (query.status) {
        clauses.push('a.status = ?');
        values.push(query.status);
      }
      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      const [[count]] = await pool.execute(
        `SELECT COUNT(*) AS total FROM student_applications AS a${where}`,
        values,
      );
      const [rows] = await pool.query(
        `SELECT a.id, a.student_id AS studentId, a.drive_id AS driveId, a.status, a.applied_at AS appliedAt,
        d.title AS driveTitle, d.status AS driveStatus, j.title AS jobTitle, c.name AS companyName
        FROM student_applications AS a JOIN placement_drives AS d ON d.id=a.drive_id
        JOIN job_postings AS j ON j.id=d.job_posting_id JOIN companies AS c ON c.id=j.company_id${where}
        ORDER BY a.id ${query.sort === 'id' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`,
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
    async lock(tx, id) {
      const [[row]] = await tx.execute(
        'SELECT id, drive_id AS driveId, student_id AS studentId, status FROM student_applications WHERE id = ? FOR UPDATE',
        [id],
      );
      return row;
    },
    async status(tx, row, toStatus, userId, remarks) {
      await tx.execute(
        'UPDATE student_applications SET status = ? WHERE id = ?',
        [toStatus, row.id],
      );
      await tx.execute(
        'INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, remarks) VALUES (?, ?, ?, ?, ?)',
        [row.id, row.status, toStatus, userId, remarks || null],
      );
    },
  };
}
