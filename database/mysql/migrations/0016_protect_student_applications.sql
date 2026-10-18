-- Purpose: preserve immutable application history (BR-12); no status-transition business rules.
CREATE TRIGGER protect_student_applications_delete BEFORE DELETE ON student_applications
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application history cannot be deleted';
