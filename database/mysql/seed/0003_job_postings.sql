-- Purpose: sample job posting; INSERT SELECT and a subquery make repeat seeding non-destructive.
INSERT INTO job_postings (company_id, title, description, job_type, ctc_lpa, location)
SELECT c.id, 'Graduate Developer (Sample)', 'Fictional graduate role for database demonstrations', 'full_time', 6.50, 'Example City'
FROM companies AS c
WHERE c.name = 'Example Campus Labs'
  AND NOT EXISTS (SELECT 1 FROM job_postings AS j WHERE j.company_id = c.id AND j.title = 'Graduate Developer (Sample)');
