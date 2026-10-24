-- ====================================================================
-- DBMS Learn & Run: Educational MySQL Platform
-- Script 07: Dedicated Practice Table for DDL and DML Experiments
-- ====================================================================

USE dbms_learn_run;

DROP TABLE IF EXISTS practice_students;

CREATE TABLE practice_students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    dept_code VARCHAR(10) NOT NULL,
    gpa DECIMAL(3, 2) NOT NULL DEFAULT 7.50,
    city VARCHAR(50) DEFAULT 'Bengaluru',
    enrollment_date DATE DEFAULT '2026-08-01',
    CONSTRAINT chk_practice_gpa CHECK (gpa >= 0.00 AND gpa <= 10.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO practice_students (roll_no, first_name, last_name, dept_code, gpa, city, enrollment_date) VALUES
('P101', 'Rahul', 'Sharma', 'CSE', 8.45, 'Bengaluru', '2026-08-01'),
('P102', 'Ananya', 'Iyer', 'ISE', 9.10, 'Mysuru', '2026-08-01'),
('P103', 'Karan', 'Patel', 'ECE', 7.20, 'Bengaluru', '2026-08-02'),
('P104', 'Meera', 'Rao', 'CSE', 8.90, 'Mangaluru', '2026-08-02'),
('P105', 'Varun', 'Deshmukh', 'MECH', 6.80, 'Hubballi', '2026-08-03');

SELECT 'Table practice_students created with 5 sample records.' AS status_message;
