-- Purpose: define companies; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE companies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  industry VARCHAR(120) NULL,
  website VARCHAR(2048) NULL,
  description TEXT NULL,
  headquarters VARCHAR(160) NULL,
  contact_email VARCHAR(254) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_companies_name UNIQUE (name),
  CONSTRAINT chk_companies_name CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  CONSTRAINT chk_companies_active CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
