-- Purpose: preserve immutable application history (BR-12); no status-transition business rules.
CREATE TRIGGER protect_application_status_history_delete BEFORE DELETE ON application_status_history
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application history cannot be deleted';
