-- Purpose: v_drive_overview; demonstrates joins, subqueries or aggregation without duplicated master data.
CREATE SQL SECURITY INVOKER VIEW v_drive_overview AS
SELECT d.id, d.title, d.status, d.registration_deadline, d.drive_date,
       d.min_cgpa, d.max_active_backlogs, d.eligible_graduation_year,
       j.id AS job_posting_id, j.title AS job_title, j.job_type, j.ctc_lpa,
       c.id AS company_id, c.name AS company_name
FROM placement_drives AS d
JOIN job_postings AS j ON j.id = d.job_posting_id
JOIN companies AS c ON c.id = j.company_id;
