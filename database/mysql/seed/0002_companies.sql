-- Purpose: fictional recruitment company; existing records are never overwritten.
INSERT INTO companies (name, industry, website, description, headquarters, contact_email)
VALUES ('Example Campus Labs', 'Software', 'https://example.edu', 'Fictional company for DBMS demonstrations', 'Example City', 'placements@example.edu')
ON DUPLICATE KEY UPDATE id = id;
