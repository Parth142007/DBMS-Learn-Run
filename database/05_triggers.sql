-- ====================================================================
-- DBMS Learn & Run: Educational MySQL Platform
-- Script 05: Database Triggers Definition
-- ====================================================================

USE dbms_learn_run;

-- --------------------------------------------------------------------
-- Auxiliary Table: registration_audit
-- Used to demonstrate trigger action logging
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registration_audit (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    log_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- Trigger 1: trg_audit_new_registration (AFTER INSERT)
-- Automatically inserts an audit record whenever a student registers
-- --------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_new_registration;

DELIMITER $$
CREATE TRIGGER trg_audit_new_registration
AFTER INSERT ON registrations
FOR EACH ROW
BEGIN
    INSERT INTO registration_audit (registration_id, student_id, event_id, action_type, details)
    VALUES (NEW.registration_id, NEW.student_id, NEW.event_id, 'INSERT', CONCAT('Status: ', NEW.status));
END$$
DELIMITER ;

-- --------------------------------------------------------------------
-- Trigger 2: trg_check_event_capacity (BEFORE INSERT)
-- Enforces that an event cannot exceed its configured capacity
-- --------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_check_event_capacity;

DELIMITER $$
CREATE TRIGGER trg_check_event_capacity
BEFORE INSERT ON registrations
FOR EACH ROW
BEGIN
    DECLARE current_count INT;
    DECLARE max_capacity INT;

    SELECT COUNT(*) INTO current_count 
    FROM registrations 
    WHERE event_id = NEW.event_id AND status != 'Cancelled';

    SELECT capacity INTO max_capacity 
    FROM events 
    WHERE event_id = NEW.event_id;

    IF current_count >= max_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Registration rejected: Event has reached full capacity.';
    END IF;
END$$
DELIMITER ;

SELECT 'Triggers and audit table created successfully!' AS status_message;
