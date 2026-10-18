-- Purpose: define placement_drives; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE placement_drives (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_posting_id INT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  status ENUM('draft','published','completed','cancelled','archived') NOT NULL DEFAULT 'draft',
  registration_deadline DATETIME NOT NULL,
  drive_date DATETIME NULL,
  min_cgpa DECIMAL(4,2) NULL,
  max_active_backlogs SMALLINT UNSIGNED NULL,
  eligible_graduation_year SMALLINT UNSIGNED NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_placement_drives_postings FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_placement_drives_users FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_placement_drives_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT chk_placement_drives_cgpa CHECK (min_cgpa BETWEEN 0 AND 10),
  CONSTRAINT chk_placement_drives_year CHECK (eligible_graduation_year BETWEEN 2000 AND 2200),
  INDEX idx_drives_status_deadline (status, registration_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
