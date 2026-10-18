-- Purpose: List a company's available job postings through the company foreign-key index.
SELECT j.id, j.title, j.job_type FROM job_postings AS j
WHERE j.company_id = ? ORDER BY j.id;
