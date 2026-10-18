# Database directories

Directories reserve space for MySQL and MongoDB schemas, migrations, seed data, and demonstration queries. They contain no executable database implementation.

MySQL will own relational master records, applications, history, and sessions. MongoDB will own recruitment-process and announcement documents only. There is no cross-database ACID transaction.

Phase 2 will introduce MySQL migrations plus the reference `mysql/schema.sql` and `mysql/seed.sql`, and MongoDB validators and indexes. No schema, seed, connection, or migration has been executed in Phase 1.
