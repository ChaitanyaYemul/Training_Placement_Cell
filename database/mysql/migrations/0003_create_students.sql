-- Purpose: define students; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  enrollment_number VARCHAR(40) NULL,
  full_name VARCHAR(120) NULL,
  phone VARCHAR(30) NULL,
  branch_id INT UNSIGNED NULL,
  graduation_year SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_students_user UNIQUE (user_id),
  CONSTRAINT uq_students_enrollment UNIQUE (enrollment_number),
  CONSTRAINT fk_students_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_students_branches FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT chk_students_enrollment CHECK (enrollment_number IS NULL OR CHAR_LENGTH(TRIM(enrollment_number)) > 0),
  CONSTRAINT chk_students_name CHECK (full_name IS NULL OR CHAR_LENGTH(TRIM(full_name)) > 0),
  CONSTRAINT chk_students_year CHECK (graduation_year BETWEEN 2000 AND 2200),
  INDEX idx_students_branch_year (branch_id, graduation_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
