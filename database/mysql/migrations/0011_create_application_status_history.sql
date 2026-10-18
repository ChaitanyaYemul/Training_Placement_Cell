-- Purpose: define application_status_history; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE application_status_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id INT UNSIGNED NOT NULL,
  from_status ENUM('applied','shortlisted','selected','rejected','withdrawn') NULL,
  to_status ENUM('applied','shortlisted','selected','rejected','withdrawn') NOT NULL,
  changed_by INT UNSIGNED NOT NULL,
  remarks VARCHAR(1000) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_application_history_applications FOREIGN KEY (application_id) REFERENCES student_applications(id) ON DELETE RESTRICT,
  CONSTRAINT fk_application_history_users FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_application_history_change CHECK (from_status IS NULL OR from_status <> to_status),
  INDEX idx_history_application_changed (application_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
