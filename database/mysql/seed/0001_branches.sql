-- Purpose: repeatable reference branches; demonstrates unique keys and non-destructive seed inserts.
INSERT INTO branches (code, name) VALUES ('CSE', 'Computer Science and Engineering'), ('ECE', 'Electronics and Communication Engineering')
ON DUPLICATE KEY UPDATE id = id;
