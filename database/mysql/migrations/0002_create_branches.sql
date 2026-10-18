-- Purpose: define branches; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE branches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL,
  CONSTRAINT uq_branches_code UNIQUE (code),
  CONSTRAINT uq_branches_name UNIQUE (name),
  CONSTRAINT chk_branches_code CHECK (CHAR_LENGTH(TRIM(code)) > 0),
  CONSTRAINT chk_branches_name CHECK (CHAR_LENGTH(TRIM(name)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
