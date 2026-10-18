-- Purpose: define academic_records; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE academic_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  semester TINYINT UNSIGNED NOT NULL,
  sgpa DECIMAL(4,2) NOT NULL,
  cgpa DECIMAL(4,2) NOT NULL,
  active_backlogs SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_academic_student_semester UNIQUE (student_id, semester),
  CONSTRAINT fk_academic_records_students FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT chk_academic_semester CHECK (semester BETWEEN 1 AND 12),
  CONSTRAINT chk_academic_sgpa CHECK (sgpa BETWEEN 0 AND 10),
  CONSTRAINT chk_academic_cgpa CHECK (cgpa BETWEEN 0 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
