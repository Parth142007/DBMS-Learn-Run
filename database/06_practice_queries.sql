-- ====================================================================
-- DBMS Learn & Run: Educational MySQL Platform
-- Script 06: Comprehensive Practice & Reference Queries
-- Mapped to NEPC42 Syllabus Modules
-- ====================================================================

USE dbms_learn_run;

-- --------------------------------------------------------------------
-- 1. BASIC DQL: Selection and Projection
-- --------------------------------------------------------------------
-- Fetch all students with GPA >= 8.5 ordered from highest to lowest
SELECT student_id, roll_no, CONCAT(first_name, ' ', last_name) AS student_name, gpa, semester
FROM students
WHERE gpa >= 8.50
ORDER BY gpa DESC;

-- Distinct semesters present in the database
SELECT DISTINCT semester
FROM students
ORDER BY semester ASC;

-- --------------------------------------------------------------------
-- 2. JOIN OPERATIONS (The Core Laboratory)
-- --------------------------------------------------------------------
-- 2.1 INNER JOIN: Students who have confirmed registrations
SELECT s.roll_no, CONCAT(s.first_name, ' ', s.last_name) AS student_name, e.event_title, r.status
FROM students s
INNER JOIN registrations r ON s.student_id = r.student_id
INNER JOIN events e ON r.event_id = e.event_id
WHERE r.status = 'Confirmed';

-- 2.2 LEFT OUTER JOIN: ALL students, including those with NO registrations (Students 8, 9, 10 appear with NULLs!)
SELECT s.roll_no, CONCAT(s.first_name, ' ', s.last_name) AS student_name, r.registration_id, e.event_title
FROM students s
LEFT JOIN registrations r ON s.student_id = r.student_id
LEFT JOIN events e ON r.event_id = e.event_id
ORDER BY s.student_id;

-- 2.3 RIGHT OUTER JOIN: ALL events, including Event 6 (Cybersecurity Summit) which has NO registrations
SELECT e.event_id, e.event_title, e.capacity, r.registration_id, s.first_name
FROM registrations r
RIGHT JOIN events e ON r.event_id = e.event_id
ORDER BY e.event_id;

-- 2.4 SELF JOIN: Students and their corresponding student mentors
SELECT 
    s.roll_no AS student_roll,
    CONCAT(s.first_name, ' ', s.last_name) AS student_name,
    m.roll_no AS mentor_roll,
    CONCAT(m.first_name, ' ', m.last_name) AS mentor_name
FROM students s
INNER JOIN students m ON s.mentor_id = m.student_id;

-- 2.5 CROSS JOIN: Cartesian product of departments and event types
SELECT d.dept_code, e.event_type
FROM departments d
CROSS JOIN (SELECT DISTINCT event_type FROM events) e;

-- --------------------------------------------------------------------
-- 3. AGGREGATES & GROUP BY / HAVING
-- --------------------------------------------------------------------
-- Count of students and average GPA per department (Only departments with avg GPA > 8.0)
SELECT d.dept_name, COUNT(s.student_id) AS student_count, ROUND(AVG(s.gpa), 2) AS avg_gpa
FROM departments d
INNER JOIN students s ON d.dept_id = s.dept_id
GROUP BY d.dept_id, d.dept_name
HAVING AVG(s.gpa) > 8.00;

-- --------------------------------------------------------------------
-- 4. NESTED & CORRELATED SUBQUERIES
-- --------------------------------------------------------------------
-- Students whose GPA is higher than the average GPA of all students
SELECT roll_no, first_name, last_name, gpa
FROM students
WHERE gpa > (SELECT AVG(gpa) FROM students);

-- Students who have NOT registered for any event (Subquery with NOT IN)
SELECT student_id, roll_no, first_name, last_name
FROM students
WHERE student_id NOT IN (SELECT DISTINCT student_id FROM registrations);

-- Correlated Subquery: Students with GPA above their own department's average
SELECT s1.roll_no, s1.first_name, s1.dept_id, s1.gpa
FROM students s1
WHERE s1.gpa > (
    SELECT AVG(s2.gpa)
    FROM students s2
    WHERE s2.dept_id = s1.dept_id
);

-- --------------------------------------------------------------------
-- 5. SET OPERATIONS (UNION & UNION ALL)
-- --------------------------------------------------------------------
-- Combined list of student email addresses and college contacts
SELECT roll_no AS code, CONCAT(first_name, ' ', last_name) AS name, email, 'Student' AS role
FROM students
UNION ALL
SELECT dept_code AS code, dept_name AS name, CONCAT(LOWER(dept_code), '@college.edu') AS email, 'Department' AS role
FROM departments;
