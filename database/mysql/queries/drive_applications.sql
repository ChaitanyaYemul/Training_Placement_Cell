-- Purpose: The cell reviews a drive applicant cohort; composite drive/status index.
SELECT a.id, a.student_id, a.status FROM student_applications AS a
WHERE a.drive_id = ? AND a.status = ? ORDER BY a.id;
