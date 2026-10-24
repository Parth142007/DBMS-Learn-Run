-- ====================================================================
-- DBMS Learn & Run: Educational MySQL Platform
-- Script 04: Database Views Definition
-- ====================================================================

USE dbms_learn_run;

-- --------------------------------------------------------------------
-- View 1: vw_student_mentorship (Educational Demo: SELF JOIN)
-- Combines student data with their mentor's name and email
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_student_mentorship AS
SELECT 
    s.student_id,
    s.roll_no,
    CONCAT(s.first_name, ' ', s.last_name) AS student_name,
    d.dept_code,
    s.semester,
    s.gpa,
    IFNULL(CONCAT(m.first_name, ' ', m.last_name), 'No Mentor Assigned') AS mentor_name,
    m.email AS mentor_email
FROM students s
INNER JOIN departments d ON s.dept_id = d.dept_id
LEFT JOIN students m ON s.mentor_id = m.student_id;

-- --------------------------------------------------------------------
-- View 2: vw_student_event_details (Educational Demo: MULTIPLE JOINS)
-- Detailed registration status for students across events
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_student_event_details AS
SELECT 
    r.registration_id,
    s.roll_no,
    CONCAT(s.first_name, ' ', s.last_name) AS student_name,
    d.dept_code AS student_dept,
    e.event_title,
    e.event_type,
    e.event_date,
    r.status AS registration_status,
    r.registration_date,
    att.check_in_status,
    fb.rating AS feedback_rating
FROM registrations r
INNER JOIN students s ON r.student_id = s.student_id
INNER JOIN departments d ON s.dept_id = d.dept_id
INNER JOIN events e ON r.event_id = e.event_id
LEFT JOIN attendance att ON r.registration_id = att.registration_id
LEFT JOIN feedback fb ON r.registration_id = fb.registration_id;

-- --------------------------------------------------------------------
-- View 3: vw_department_statistics (Educational Demo: AGGREGATES & GROUP BY)
-- Department-level metrics: student count, avg GPA, budget
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_department_statistics AS
SELECT 
    d.dept_id,
    d.dept_code,
    d.dept_name,
    COUNT(s.student_id) AS total_enrolled_students,
    ROUND(IFNULL(AVG(s.gpa), 0.00), 2) AS average_gpa,
    d.budget,
    COUNT(DISTINCT e.event_id) AS total_events_organized
FROM departments d
LEFT JOIN students s ON d.dept_id = s.dept_id
LEFT JOIN events e ON d.dept_id = e.dept_id
GROUP BY d.dept_id, d.dept_code, d.dept_name, d.budget;

-- --------------------------------------------------------------------
-- View 4: vw_event_occupancy (Educational Demo: CAPACITY & RATIO)
-- Tracks event capacity vs actual registrations
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_event_occupancy AS
SELECT 
    e.event_id,
    e.event_title,
    e.event_type,
    e.capacity,
    COUNT(r.registration_id) AS registered_students,
    (e.capacity - COUNT(r.registration_id)) AS remaining_seats,
    ROUND((COUNT(r.registration_id) / e.capacity) * 100, 1) AS occupancy_percentage
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
GROUP BY e.event_id, e.event_title, e.event_type, e.capacity;

SELECT 'All 4 educational views created successfully!' AS status_message;
