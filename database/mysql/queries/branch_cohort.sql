-- Purpose: Find a branch/year cohort without duplicating branch names on students.
SELECT s.id, s.enrollment_number FROM students AS s
WHERE s.branch_id = ? AND s.graduation_year = ? ORDER BY s.id;
