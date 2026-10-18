-- Purpose: Show an ordered audit timeline through the application/date index.
SELECT h.id, h.from_status, h.to_status, h.changed_at FROM application_status_history AS h
WHERE h.application_id = ? ORDER BY h.changed_at, h.id;
