-- ====================================================================
-- DBMS Learn & Run: Educational MySQL Platform
-- Script 01: Database Creation and Privileges Setup
-- ====================================================================

-- 1. Create the database if it doesn't already exist
CREATE DATABASE IF NOT EXISTS dbms_learn_run
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 2. Select the database for subsequent operations
USE dbms_learn_run;

-- 3. (Optional) Dedicated local practice user creation for safe student practice
-- Uncomment the lines below if you wish to set up a dedicated low-privilege user
-- CREATE USER IF NOT EXISTS 'dbms_student'@'localhost' IDENTIFIED BY 'StudentPass123!';
-- GRANT SELECT, INSERT, UPDATE, DELETE, CREATE TEMPORARY TABLES ON dbms_learn_run.* TO 'dbms_student'@'localhost';
-- FLUSH PRIVILEGES;

SELECT 'Database dbms_learn_run successfully initialized!' AS status_message;
