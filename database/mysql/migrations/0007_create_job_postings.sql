-- Purpose: define job_postings; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE job_postings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  job_type ENUM('full_time','internship','internship_ppo') NOT NULL,
  ctc_lpa DECIMAL(8,2) NULL,
  location VARCHAR(160) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_postings_companies FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT chk_job_postings_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT chk_job_postings_description CHECK (CHAR_LENGTH(TRIM(description)) > 0),
  CONSTRAINT chk_job_postings_ctc CHECK (ctc_lpa >= 0),
  CONSTRAINT chk_job_postings_active CHECK (is_active IN (0,1)),
  INDEX idx_job_postings_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
