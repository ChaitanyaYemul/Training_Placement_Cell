-- Purpose: define drive_eligible_branches; demonstrates keys, constraints and normalized relational ownership.
CREATE TABLE drive_eligible_branches (
  drive_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (drive_id, branch_id),
  CONSTRAINT fk_drive_eligible_branches_drives FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
  CONSTRAINT fk_drive_eligible_branches_branches FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
