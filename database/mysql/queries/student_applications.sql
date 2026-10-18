-- Purpose: A student tracks their own applications; composite student/status index.
SELECT a.id, a.drive_id, a.status FROM student_applications AS a
WHERE a.student_id = ? AND a.status = ? ORDER BY a.id;
