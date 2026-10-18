-- Purpose: v_application_details; demonstrates joins, subqueries or aggregation without duplicated master data.
CREATE SQL SECURITY INVOKER VIEW v_application_details AS
SELECT a.id, a.student_id, a.drive_id, a.status, a.applied_at,
       s.enrollment_number, s.full_name, s.branch_id,
       d.title AS drive_title, j.title AS job_title, c.name AS company_name
FROM student_applications AS a
JOIN students AS s ON s.id = a.student_id
JOIN placement_drives AS d ON d.id = a.drive_id
JOIN job_postings AS j ON j.id = d.job_posting_id
JOIN companies AS c ON c.id = j.company_id;
