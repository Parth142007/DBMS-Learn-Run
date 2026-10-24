-- ====================================================================
-- DBMS Learn & Run: Module 5 (Phase 5) Persistence Schema
-- Tracks lesson completion, quiz scores, and practice lab attempts.
-- Isolated auxiliary table that preserves existing 8 application tables.
-- ====================================================================

USE dbms_learn_run;

CREATE TABLE IF NOT EXISTS phase5_learning_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL DEFAULT 'default_student',
    lesson_id VARCHAR(32) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    quiz_score INT NOT NULL DEFAULT 0,
    quiz_max_score INT NOT NULL DEFAULT 3,
    quiz_attempted BOOLEAN NOT NULL DEFAULT FALSE,
    practice_completed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_session_lesson (session_id, lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
