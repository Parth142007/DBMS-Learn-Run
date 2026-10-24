-- ====================================================================
-- DBMS Learn & Run: Educational MySQL Platform
-- Script 02: Table Schema Definition (InnoDB Engine)
-- ====================================================================

USE dbms_learn_run;

-- Drop dependent tables in reverse order to respect foreign key constraints
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS organizers;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS departments;

-- --------------------------------------------------------------------
-- 1. Table: departments
-- Represents academic departments in the institution
-- --------------------------------------------------------------------
CREATE TABLE departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_code VARCHAR(10) NOT NULL UNIQUE,
    dept_name VARCHAR(100) NOT NULL,
    building VARCHAR(50) NOT NULL,
    budget DECIMAL(12, 2) NOT NULL DEFAULT 50000.00,
    established_year INT NOT NULL,
    CONSTRAINT chk_dept_year CHECK (established_year >= 1950)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. Table: students
-- Represents enrolled students. Contains mentor_id (Self-Referencing FK)
-- --------------------------------------------------------------------
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    dept_id INT NOT NULL,
    semester INT NOT NULL,
    gpa DECIMAL(3, 2) NOT NULL DEFAULT 7.00,
    mentor_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_student_semester CHECK (semester BETWEEN 1 AND 8),
    CONSTRAINT chk_student_gpa CHECK (gpa >= 0.00 AND gpa <= 10.00),
    CONSTRAINT fk_students_department FOREIGN KEY (dept_id)
        REFERENCES departments(dept_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_students_mentor FOREIGN KEY (mentor_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. Table: courses
-- Academic courses offered by departments
-- --------------------------------------------------------------------
CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(15) NOT NULL UNIQUE,
    course_name VARCHAR(120) NOT NULL,
    credits INT NOT NULL,
    dept_id INT NOT NULL,
    CONSTRAINT chk_course_credits CHECK (credits BETWEEN 1 AND 6),
    CONSTRAINT fk_courses_department FOREIGN KEY (dept_id)
        REFERENCES departments(dept_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. Table: events
-- Campus technical and cultural events organized by departments
-- --------------------------------------------------------------------
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_title VARCHAR(150) NOT NULL,
    event_type ENUM('Workshop', 'Hackathon', 'Seminar', 'TechFest', 'Webinar') NOT NULL,
    event_date DATE NOT NULL,
    location VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    dept_id INT NOT NULL,
    CONSTRAINT chk_event_capacity CHECK (capacity > 0),
    CONSTRAINT fk_events_department FOREIGN KEY (dept_id)
        REFERENCES departments(dept_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. Table: organizers
-- Student coordinators assigned to events (Many-to-Many association)
-- --------------------------------------------------------------------
CREATE TABLE organizers (
    organizer_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    role VARCHAR(60) NOT NULL DEFAULT 'Lead Coordinator',
    assigned_date DATE NOT NULL,
    CONSTRAINT uk_organizer_event UNIQUE (student_id, event_id),
    CONSTRAINT fk_organizers_student FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_organizers_event FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 6. Table: registrations
-- Event registration transactions for students
-- --------------------------------------------------------------------
CREATE TABLE registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    registration_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Confirmed', 'Pending', 'Cancelled') NOT NULL DEFAULT 'Confirmed',
    CONSTRAINT uk_student_registration UNIQUE (student_id, event_id),
    CONSTRAINT fk_registrations_student FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_registrations_event FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 7. Table: attendance
-- Check-in records for confirmed event attendees (1-to-1 with registrations)
-- --------------------------------------------------------------------
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL UNIQUE,
    attended_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_in_status ENUM('Present', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
    CONSTRAINT fk_attendance_registration FOREIGN KEY (registration_id)
        REFERENCES registrations(registration_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 8. Table: feedback
-- Student feedback and ratings for events attended
-- --------------------------------------------------------------------
CREATE TABLE feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL UNIQUE,
    rating INT NOT NULL,
    comments TEXT,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_feedback_registration FOREIGN KEY (registration_id)
        REFERENCES registrations(registration_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Indexes for query optimization
CREATE INDEX idx_students_dept ON students(dept_id);
CREATE INDEX idx_students_mentor ON students(mentor_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_registrations_status ON registrations(status);

SELECT 'All 8 tables created successfully!' AS status_message;
