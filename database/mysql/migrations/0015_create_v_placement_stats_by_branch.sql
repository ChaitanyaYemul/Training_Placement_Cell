-- Purpose: v_placement_stats_by_branch; demonstrates joins, subqueries or aggregation without duplicated master data.
CREATE SQL SECURITY INVOKER VIEW v_placement_stats_by_branch AS
SELECT b.id AS branch_id, b.code AS branch_code, b.name AS branch_name,
       COUNT(DISTINCT s.id) AS student_count,
       COUNT(DISTINCT CASE WHEN a.status = 'selected' THEN s.id END) AS selected_student_count
FROM branches AS b
LEFT JOIN students AS s ON s.branch_id = b.id
LEFT JOIN student_applications AS a ON a.student_id = s.id
GROUP BY b.id, b.code, b.name;
