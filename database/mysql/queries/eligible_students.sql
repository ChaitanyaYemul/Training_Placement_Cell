-- Purpose: DBMS demonstration of joins and correlated EXISTS for deterministic eligibility criteria; not an API decision service.
SELECT s.id AS student_id FROM students AS s
JOIN v_student_academic_summary AS a ON a.student_id = s.id
JOIN placement_drives AS d ON d.id = ?
WHERE a.cgpa >= d.min_cgpa AND a.active_backlogs <= d.max_active_backlogs
  AND s.graduation_year = d.eligible_graduation_year
  AND EXISTS (SELECT 1 FROM drive_eligible_branches AS eb WHERE eb.drive_id = d.id AND eb.branch_id = s.branch_id)
ORDER BY s.id;
