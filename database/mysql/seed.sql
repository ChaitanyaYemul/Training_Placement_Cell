-- Reference snapshot; db:seed executes the single-statement files in mysql/seed in a transaction.
-- No users, credentials, password hashes, or real student data.

-- Purpose: repeatable reference branches; demonstrates unique keys and non-destructive seed inserts.
INSERT INTO branches (code, name) VALUES ('CSE', 'Computer Science and Engineering'), ('ECE', 'Electronics and Communication Engineering')
ON DUPLICATE KEY UPDATE id = id;

-- Purpose: fictional recruitment company; existing records are never overwritten.
INSERT INTO companies (name, industry, website, description, headquarters, contact_email)
VALUES ('Example Campus Labs', 'Software', 'https://example.edu', 'Fictional company for DBMS demonstrations', 'Example City', 'placements@example.edu')
ON DUPLICATE KEY UPDATE id = id;

-- Purpose: sample job posting; INSERT SELECT and a subquery make repeat seeding non-destructive.
INSERT INTO job_postings (company_id, title, description, job_type, ctc_lpa, location)
SELECT c.id, 'Graduate Developer (Sample)', 'Fictional graduate role for database demonstrations', 'full_time', 6.50, 'Example City'
FROM companies AS c
WHERE c.name = 'Example Campus Labs'
  AND NOT EXISTS (SELECT 1 FROM job_postings AS j WHERE j.company_id = c.id AND j.title = 'Graduate Developer (Sample)');
