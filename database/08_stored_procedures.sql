-- ====================================================================
-- DBMS Learn & Run: Educational MySQL Platform
-- Script 08: Stored Procedures Definition (Phase 4)
-- ====================================================================

USE dbms_learn_run;

-- --------------------------------------------------------------------
-- Procedure 1: sp_get_students_by_department
-- Returns the student roster belonging to a specified department code
-- --------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_get_students_by_department;

DELIMITER $$
CREATE PROCEDURE sp_get_students_by_department(IN in_dept_code VARCHAR(10))
BEGIN
    SELECT 
        s.student_id,
        s.roll_no,
        CONCAT(s.first_name, ' ', s.last_name) AS student_name,
        d.dept_code,
        d.dept_name,
        s.semester,
        s.gpa
    FROM students s
    INNER JOIN departments d ON s.dept_id = d.dept_id
    WHERE d.dept_code = in_dept_code
    ORDER BY s.gpa DESC;
END$$
DELIMITER ;

-- --------------------------------------------------------------------
-- Procedure 2: sp_get_event_roster
-- Returns confirmed and registered attendees for a specific event
-- --------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_get_event_roster;

DELIMITER $$
CREATE PROCEDURE sp_get_event_roster(IN in_event_id INT)
BEGIN
    SELECT 
        r.registration_id,
        e.event_title,
        s.roll_no,
        CONCAT(s.first_name, ' ', s.last_name) AS student_name,
        s.email,
        r.status AS registration_status,
        r.registration_date
    FROM registrations r
    INNER JOIN events e ON r.event_id = e.event_id
    INNER JOIN students s ON r.student_id = s.student_id
    WHERE r.event_id = in_event_id
    ORDER BY r.registration_id ASC;
END$$
DELIMITER ;

-- --------------------------------------------------------------------
-- Procedure 3: sp_calculate_dept_gpa
-- Computes average GPA and student count for a department using OUT parameters
-- --------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_dept_gpa;

DELIMITER $$
CREATE PROCEDURE sp_calculate_dept_gpa(
    IN in_dept_code VARCHAR(10),
    OUT out_avg_gpa DECIMAL(3,2),
    OUT out_student_count INT
)
BEGIN
    SELECT 
        IFNULL(ROUND(AVG(s.gpa), 2), 0.00),
        COUNT(s.student_id)
    INTO out_avg_gpa, out_student_count
    FROM departments d
    LEFT JOIN students s ON d.dept_id = s.dept_id
    WHERE d.dept_code = in_dept_code;
END$$
DELIMITER ;

-- --------------------------------------------------------------------
-- Procedure 4: sp_register_student_safe
-- Safe procedural registration demonstrating IF check and transaction safety
-- --------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_register_student_safe;

DELIMITER $$
CREATE PROCEDURE sp_register_student_safe(
    IN in_student_id INT,
    IN in_event_id INT,
    OUT out_status VARCHAR(20),
    OUT out_message VARCHAR(150)
)
BEGIN
    DECLARE v_already_registered INT DEFAULT 0;
    DECLARE v_current_capacity INT DEFAULT 0;
    DECLARE v_registered_count INT DEFAULT 0;

    -- Check if student already registered
    SELECT COUNT(*) INTO v_already_registered
    FROM registrations
    WHERE student_id = in_student_id AND event_id = in_event_id;

    IF v_already_registered > 0 THEN
        SET out_status = 'REJECTED';
        SET out_message = 'Student is already registered for this event.';
    ELSE
        -- Check event capacity
        SELECT capacity INTO v_current_capacity
        FROM events
        WHERE event_id = in_event_id;

        SELECT COUNT(*) INTO v_registered_count
        FROM registrations
        WHERE event_id = in_event_id AND status != 'Cancelled';

        IF v_registered_count >= v_current_capacity THEN
            SET out_status = 'FULL';
            SET out_message = 'Registration rejected: Event capacity has been reached.';
        ELSE
            INSERT INTO registrations (student_id, event_id, status)
            VALUES (in_student_id, in_event_id, 'Confirmed');
            SET out_status = 'SUCCESS';
            SET out_message = 'Registration confirmed successfully.';
        END IF;
    END IF;
END$$
DELIMITER ;

SELECT 'All 4 stored procedures created successfully!' AS status_message;
