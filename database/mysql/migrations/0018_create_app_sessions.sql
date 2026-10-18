-- Purpose: persistent, expiring server-side authentication sessions; indexed TTL cleanup.
CREATE TABLE app_sessions (
  session_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT NOT NULL,
  CONSTRAINT chk_app_sessions_json CHECK (JSON_VALID(data)),
  INDEX idx_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
