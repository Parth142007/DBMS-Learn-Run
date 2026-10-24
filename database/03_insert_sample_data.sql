-- ====================================================================
-- DBMS Learn & Run: Educational MySQL Platform
-- Script 03: Realistic Sample Data Insertion
-- ====================================================================

USE dbms_learn_run;

-- Disable foreign key checks momentarily to allow clean bulk reset
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE feedback;
TRUNCATE TABLE attendance;
TRUNCATE TABLE registrations;
TRUNCATE TABLE organizers;
TRUNCATE TABLE events;
TRUNCATE TABLE courses;
TRUNCATE TABLE students;
TRUNCATE TABLE departments;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------
-- 1. Insert Departments
-- Note: 'CIVIL' has 0 students and 0 events (ideal for JOIN demos)
-- --------------------------------------------------------------------
INSERT INTO departments (dept_id, dept_code, dept_name, building, budget, established_year) VALUES
(1, 'CSE', 'Computer Science and Engineering', 'Turing Block', 150000.00, 1995),
(2, 'ISE', 'Information Science and Engineering', 'Shannon Hall', 120000.00, 2002),
(3, 'ECE', 'Electronics and Communication Engineering', 'Tesla Wing', 135000.00, 1990),
(4, 'MECH', 'Mechanical Engineering', 'Newton Workshop', 95000.00, 1985),
(5, 'CIVIL', 'Civil Engineering', 'Visvesvaraya Complex', 80000.00, 1980);

-- --------------------------------------------------------------------
-- 2. Insert Students
-- Note:
-- - Students 1 & 4 are senior mentors (mentor_id IS NULL)
-- - Students 2, 3, 5, 6, 8, 9 are mentored by peers (SELF JOIN demos)
-- - Students 8, 9, 10 have NO event registrations (OUTER JOIN demos)
-- --------------------------------------------------------------------
INSERT INTO students (student_id, roll_no, first_name, last_name, email, phone, dept_id, semester, gpa, mentor_id) VALUES
(1, '1MS22CS001', 'Aarav', 'Sharma', 'aarav.sharma@college.edu', '9876543210', 1, 5, 9.25, NULL),
(2, '1MS22CS045', 'Priya', 'Nair', 'priya.nair@college.edu', '9876543211', 1, 5, 8.80, 1),
(3, '1MS23IS012', 'Rohan', 'Verma', 'rohan.verma@college.edu', '9876543212', 2, 3, 7.95, 1),
(4, '1MS22IS034', 'Aisha', 'Khan', 'aisha.khan@college.edu', '9876543213', 2, 5, 9.40, NULL),
(5, '1MS22EC018', 'Vikram', 'Patel', 'vikram.patel@college.edu', '9876543214', 3, 5, 8.15, 4),
(6, '1MS23EC050', 'Sneha', 'Rao', 'sneha.rao@college.edu', '9876543215', 3, 3, 8.60, 4),
(7, '1MS22ME005', 'Karthik', 'Reddy', 'karthik.reddy@college.edu', '9876543216', 4, 5, 7.50, NULL),
(8, '1MS23CS088', 'Ananya', 'Deshmukh', 'ananya.deshmukh@college.edu', '9876543217', 1, 3, 8.95, 2),
(9, '1MS24IS099', 'Arjun', 'Mehta', 'arjun.mehta@college.edu', '9876543218', 2, 1, 6.85, 3),
(10, '1MS24ME042', 'Divya', 'Iyer', 'divya.iyer@college.edu', '9876543219', 4, 1, 7.20, NULL);

-- --------------------------------------------------------------------
-- 3. Insert Courses
-- --------------------------------------------------------------------
INSERT INTO courses (course_id, course_code, course_name, credits, dept_id) VALUES
(1, 'CS501', 'Database Management Systems', 4, 1),
(2, 'CS502', 'Operating Systems', 4, 1),
(3, 'IS301', 'Data Structures & Algorithms', 4, 2),
(4, 'IS302', 'Web Application Development', 3, 2),
(5, 'EC501', 'Digital Signal Processing', 4, 3),
(6, 'ME501', 'Thermodynamics & Fluid Mechanics', 4, 4);

-- --------------------------------------------------------------------
-- 4. Insert Events
-- Note: Event 6 has 0 registrations (ideal for RIGHT JOIN / anti-join)
-- --------------------------------------------------------------------
INSERT INTO events (event_id, event_title, event_type, event_date, location, capacity, dept_id) VALUES
(1, 'HackDBMS 2026', 'Hackathon', '2026-11-15', 'Main Auditorium', 100, 1),
(2, 'AI & Data Engineering Workshop', 'Workshop', '2026-11-20', 'Turing Lab 3', 45, 1),
(3, 'Full Stack Web Dev Bootcamp', 'Workshop', '2026-11-25', 'Shannon Lab 1', 50, 2),
(4, 'IoT & Robotics Expo', 'Seminar', '2026-12-05', 'Tesla Seminar Hall', 60, 3),
(5, 'CAD & 3D Printing Challenge', 'TechFest', '2026-12-10', 'Newton CAD Center', 35, 4),
(6, 'Cybersecurity & Cloud Summit 2026', 'Seminar', '2026-12-18', 'Main Convention Hall', 150, 1);

-- --------------------------------------------------------------------
-- 5. Insert Organizers
-- --------------------------------------------------------------------
INSERT INTO organizers (organizer_id, student_id, event_id, role, assigned_date) VALUES
(1, 1, 1, 'Lead Coordinator', '2026-10-01'),
(2, 2, 1, 'Technical Lead', '2026-10-02'),
(3, 4, 3, 'Lead Coordinator', '2026-10-05'),
(4, 5, 4, 'Event Coordinator', '2026-10-10'),
(5, 7, 5, 'Workshop Assistant', '2026-10-12');

-- --------------------------------------------------------------------
-- 6. Insert Registrations
-- --------------------------------------------------------------------
INSERT INTO registrations (registration_id, student_id, event_id, registration_date, status) VALUES
(1, 1, 1, '2026-10-15 10:30:00', 'Confirmed'),
(2, 2, 1, '2026-10-15 11:15:00', 'Confirmed'),
(3, 3, 1, '2026-10-16 09:45:00', 'Confirmed'),
(4, 4, 1, '2026-10-16 14:20:00', 'Confirmed'),
(5, 5, 1, '2026-10-17 16:00:00', 'Pending'),
(6, 1, 2, '2026-10-18 10:00:00', 'Confirmed'),
(7, 2, 2, '2026-10-18 11:30:00', 'Confirmed'),
(8, 6, 2, '2026-10-19 15:10:00', 'Cancelled'),
(9, 3, 3, '2026-10-20 12:00:00', 'Confirmed'),
(10, 4, 3, '2026-10-20 13:40:00', 'Confirmed'),
(11, 5, 4, '2026-10-21 09:15:00', 'Confirmed'),
(12, 6, 4, '2026-10-21 10:50:00', 'Confirmed'),
(13, 7, 5, '2026-10-22 14:10:00', 'Confirmed');

-- --------------------------------------------------------------------
-- 7. Insert Attendance Records
-- --------------------------------------------------------------------
INSERT INTO attendance (attendance_id, registration_id, attended_at, check_in_status) VALUES
(1, 1, '2026-11-15 09:00:00', 'Present'),
(2, 2, '2026-11-15 09:05:00', 'Present'),
(3, 3, '2026-11-15 09:20:00', 'Late'),
(4, 4, '2026-11-15 08:55:00', 'Present'),
(5, 6, '2026-11-20 09:02:00', 'Present'),
(6, 7, '2026-11-20 09:10:00', 'Present'),
(7, 9, '2026-11-25 09:00:00', 'Present'),
(8, 10, '2026-11-25 09:05:00', 'Present'),
(9, 11, '2026-12-05 09:00:00', 'Present');

-- --------------------------------------------------------------------
-- 8. Insert Feedback Records
-- --------------------------------------------------------------------
INSERT INTO feedback (feedback_id, registration_id, rating, comments, submitted_at) VALUES
(1, 1, 5, 'Outstanding hackathon! Great mentor support and problem statements.', '2026-11-15 18:30:00'),
(2, 2, 5, 'Seamless coordination and challenging SQL tracks.', '2026-11-15 18:45:00'),
(3, 3, 4, 'Learned practical query optimization techniques.', '2026-11-15 19:10:00'),
(4, 6, 5, 'AI pipeline hands-on was top notch.', '2026-11-20 17:30:00'),
(5, 9, 4, 'Clear explanation of REST APIs and Flask framework.', '2026-11-25 17:45:00'),
(6, 11, 3, 'Good hardware demo, needed more time for hands-on programming.', '2026-12-05 16:30:00');

SELECT 'Sample data inserted successfully across all 8 tables!' AS status_message;
