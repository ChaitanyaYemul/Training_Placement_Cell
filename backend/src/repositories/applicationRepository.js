import { rowDto } from './resourceRepository.js';
export function applicationRepository(pool) {
  return {
    async existing(tx, driveId, studentId) {
      const [[row]] = await tx.execute(
        'SELECT id, status FROM student_applications WHERE drive_id = ? AND student_id = ?',
        [driveId, studentId],
      );
      return row;
    },
    async insertOpen(tx, driveId, studentId) {
      // BR-03/04: enforce the DB-clock deadline at the actual INSERT; UNIQUE is the final duplicate guard.
      const [result] = await tx.execute(
        `INSERT INTO student_applications (drive_id, student_id)
        SELECT id, ? FROM placement_drives WHERE id = ? AND status = 'published' AND UTC_TIMESTAMP() < registration_deadline`,
        [studentId, driveId],
      );
      return result.affectedRows ? result.insertId : null;
    },
    async initialHistory(tx, applicationId, userId) {
      await tx.execute(
        "INSERT INTO application_status_history (application_id, from_status, to_status, changed_by) VALUES (?, NULL, 'applied', ?)",
        [applicationId, userId],
      );
    },
    async detail(id, studentId) {
      // A single statement gives application + history one consistent snapshot, including archived drive context.
      const [rows] = await pool.execute(
        `SELECT a.id, a.student_id AS studentId, a.drive_id AS driveId,
        a.status, a.applied_at AS appliedAt, a.updated_at AS updatedAt,
        d.title AS driveTitle, d.status AS driveStatus, j.title AS jobTitle, c.name AS companyName,
        h.id AS historyId, h.from_status AS fromStatus, h.to_status AS toStatus,
        h.changed_by AS changedBy, u.role AS actorRole, h.remarks, h.changed_at AS changedAt
        FROM student_applications AS a JOIN placement_drives AS d ON d.id = a.drive_id
        JOIN job_postings AS j ON j.id = d.job_posting_id JOIN companies AS c ON c.id = j.company_id
        LEFT JOIN application_status_history AS h ON h.application_id = a.id
        LEFT JOIN users AS u ON u.id = h.changed_by
        WHERE a.id = ?${studentId === undefined ? '' : ' AND a.student_id = ?'}
        ORDER BY h.changed_at ASC, h.id ASC`,
        studentId === undefined ? [id] : [id, studentId],
      );
      if (!rows.length) return null;
      const r = rows[0];
      return {
        ...rowDto({
          id: r.id,
          studentId: r.studentId,
          driveId: r.driveId,
          status: r.status,
          appliedAt: r.appliedAt,
          updatedAt: r.updatedAt,
          driveTitle: r.driveTitle,
          driveStatus: r.driveStatus,
          jobTitle: r.jobTitle,
          companyName: r.companyName,
        }),
        history: rows
          .filter((event) => event.historyId !== null)
          .map((event) =>
            rowDto({
              id: event.historyId,
              fromStatus: event.fromStatus,
              toStatus: event.toStatus,
              changedBy: event.changedBy,
              actorRole: event.actorRole,
              remarks: event.remarks,
              changedAt: event.changedAt,
            }),
          ),
      };
    },
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
    async lock(tx, id, studentId) {
      const [[row]] = await tx.execute(
        `SELECT id, drive_id AS driveId, student_id AS studentId, status FROM student_applications WHERE id = ?${studentId === undefined ? '' : ' AND student_id = ?'} FOR UPDATE`,
        studentId === undefined ? [id] : [id, studentId],
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
