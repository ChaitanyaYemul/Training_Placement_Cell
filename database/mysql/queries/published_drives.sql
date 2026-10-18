-- Purpose: A student browses published, open drives; composite filtering and pagination.
SELECT d.id, d.title, d.registration_deadline
FROM placement_drives AS d
WHERE d.status = ? AND d.registration_deadline >= ?
ORDER BY d.registration_deadline, d.id LIMIT ? OFFSET ?;
