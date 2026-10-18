-- Purpose: Aggregate selected applications by company, using joins, GROUP BY and HAVING.
SELECT c.id AS company_id, c.name AS company_name, COUNT(*) AS selected_count
FROM student_applications AS a
JOIN placement_drives AS d ON d.id = a.drive_id
JOIN job_postings AS j ON j.id = d.job_posting_id
JOIN companies AS c ON c.id = j.company_id
WHERE a.status = 'selected'
GROUP BY c.id, c.name HAVING COUNT(*) > 0 ORDER BY c.id;
