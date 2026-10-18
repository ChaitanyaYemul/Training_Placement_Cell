# ADR 001: Argon2id password hashing

Status: approved by the user in this conversation before implementation. AGENTS.md is unchanged.

Use the maintained argon2 package with Argon2id, memoryCost 19456 KiB, timeCost 2, parallelism 1, and library-generated random salts. One algorithm is used for students and administrators. Minimum length is 8 characters; maximum input length is 1024 characters to bound resource consumption. Passwords are not normalized or trimmed. Neither plaintext credentials nor hashes appear in responses/logs. No default passwords or hashes are seeded.

The auth repository is the only application location selecting password_hash. The authentication service verifies a dummy Argon2id hash for nonexistent accounts to avoid the cheap unknown-user path. Invalid-password, unknown-user and inactive-account errors are generic. Authentication endpoints are IP-rate-limited. Registration creates a student account/profile in one MySQL transaction; any supplied role is discarded (BR-17).
