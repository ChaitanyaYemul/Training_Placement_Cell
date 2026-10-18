-- Purpose: define student_applications; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE student_applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  drive_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  status ENUM('applied','shortlisted','selected','rejected','withdrawn') NOT NULL DEFAULT 'applied',
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_applications_drive_student UNIQUE (drive_id, student_id),
  CONSTRAINT fk_student_applications_drives FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_applications_students FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  INDEX idx_applications_student_status (student_id, status),
  INDEX idx_applications_drive_status (drive_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
