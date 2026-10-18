-- Purpose: v_student_academic_summary; demonstrates joins, subqueries or aggregation without duplicated master data.
CREATE SQL SECURITY INVOKER VIEW v_student_academic_summary AS
SELECT s.id AS student_id, s.branch_id, s.graduation_year,
       a.semester, a.sgpa, a.cgpa, a.active_backlogs
FROM students AS s
LEFT JOIN academic_records AS a ON a.student_id = s.id
  AND a.semester = (SELECT MAX(latest.semester) FROM academic_records AS latest WHERE latest.student_id = s.id);
