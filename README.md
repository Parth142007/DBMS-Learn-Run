# DBMS Learn & Run &mdash; Interactive MySQL Learning Platform

An educational, interactive DBMS learning website inspired by the instructional structure of **GeeksforGeeks**. Built specifically for undergraduate students studying the **NEPC42 Database Management Systems** syllabus.

Unlike static documentation, **DBMS Learn & Run** connects directly to your local **MySQL 8.0 Server**, allowing you to execute queries in real time, inspect the results, modify parameters, and observe the immediate behavior of relational algebra, joins, subqueries, and transactions.

---

## Architecture & Tech Stack

- **Backend:** Python Flask (REST API & Jinja2 server-side templates)
- **Database:** MySQL 8.0 Community Server (InnoDB Storage Engine)
- **Database Driver:** `PyMySQL` / `mysql-connector-python` with connection safety checks
- **Frontend:** HTML5, CSS3, Bootstrap 5, Bootstrap Icons, Native JavaScript (No React/Node.js build chain required)

---

## Project Structure

```text
Project/
├── app.py                      # Flask Application entry point and API endpoints
├── config.py                   # Centralized configuration and security policies
├── db.py                       # Database connection helper & query execution engine
├── init_db.py                  # Automated database setup script for Windows
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variables template
├── .env                        # Local MySQL credentials
├── README.md                   # Complete documentation and setup guide
│
├── database/                   # Structured SQL scripts
│   ├── 01_create_database.sql  # Database creation (dbms_learn_run)
│   ├── 02_create_tables.sql    # 8 Relational tables with PKs, FKs, constraints
│   ├── 03_insert_sample_data.sql # Deliberate matching & non-matching records
│   ├── 04_views.sql            # Educational views (self-join, multi-join)
│   ├── 05_triggers.sql         # Audit log & capacity validation triggers
│   ├── 06_practice_queries.sql # Ready-to-run queries mapped to syllabus
│   ├── 07_practice_table.sql   # Isolated practice_students sandbox table
│   └── 08_stored_procedures.sql # Stored procedures for department lookups, GPA calculation & safe registration
│
├── templates/                  # Jinja2 Templates
│   ├── base.html               # Main layout with 16-topic syllabus sidebar & Phase 4 navigation
│   ├── index.html              # Live dashboard & interactive SQL runner
│   ├── schema.html             # Relational schema inspector (8 tables)
│   ├── phase2.html             # Phase 2 Learning Module container
│   ├── phase2/                 # Modular Phase 2 topic partials (Topics 1-4)
│   ├── phase3.html             # Phase 3 Learning Dashboard & SQL Lab container
│   ├── phase3/                 # Modular Phase 3 topic partials (Topics 1-10)
│   ├── phase4.html             # Phase 4 Views, Triggers & Security Module container
│   └── phase4/                 # Modular Phase 4 topic partials (Topics 1-5)
│       ├── topic1_views.html       # Topic 1: Views, updatability & WITH CHECK OPTION
│       ├── topic2_triggers.html    # Topic 2: BEFORE/AFTER triggers & audit logging
│       ├── topic3_constraints.html # Topic 3: PK, FK, UNIQUE, NOT NULL, CHECK, DEFAULT
│       ├── topic4_procedures.html  # Topic 4: Stored procedures, IN/OUT params & procedural logic
│       └── topic5_security.html    # Topic 5: Authorization, GRANT/REVOKE, MySQL 8 Roles & SQLi defense
│
├── static/                     # Static assets
│   ├── css/style.css           # Styling for tabs, diagrams, role cards & code snippets
│   └── js/
│       ├── app.js              # Dynamic query execution & output rendering
│       ├── phase2.js           # Phase 2 progress, quizzes & simulator
│       ├── phase3.js           # Phase 3 SQL Lab, tab routing, quizzes & table reset
│       └── phase4.js           # Phase 4 laboratories, procedure runner, RBAC simulator & progress
│
└── tests/                      # Automated test suite (39 tests passing)
    ├── test_database.py        # Database helper & serialization tests
    ├── test_sql_lab.py         # SQL parsing & safety tests
    ├── test_phase2.py          # Phase 2 routes, topics, quizzes, and regression tests
    ├── test_phase3.py          # Phase 3 routes, 10 topics, joins, aggregates, subqueries, safeguards
    └── test_phase4.py          # Phase 4 routes, views, triggers, constraints, procedures & security
```

---

## Practice Schema Overview: `dbms_learn_run`

The platform uses an authentic university event and mentorship ecosystem with 8 interconnected tables:

1. **`departments`**: Academic units with budgets and established years. *(Civil Engineering has 0 students and 0 events to demonstrate `RIGHT JOIN` / `LEFT JOIN`)*.
2. **`students`**: Enrolled students with roll numbers, GPA, semester, and a self-referencing `mentor_id` foreign key *(to demonstrate `SELF JOIN`)*. *(Students 8, 9, 10 have 0 registrations to demonstrate outer joins)*.
3. **`courses`**: Academic subjects offered by departments with credit values.
4. **`events`**: Campus hackathons, workshops, and seminars. *(Event 6 has 0 registrations to demonstrate non-matching records in `RIGHT JOIN`)*.
5. **`organizers`**: Junction table for student event coordinators (Many-to-Many).
6. **`registrations`**: Student event registration transactions with composite unique constraints and `status` ENUM.
7. **`attendance`**: Check-in records (1-to-1 relationship with `registrations`).
8. **`feedback`**: Student ratings (1 to 5 with `CHECK` constraint) and comments.

---

## Windows Quickstart Guide

### 1. Configure Your MySQL Password
Open the `.env` file in the project folder and set your MySQL `root` password:
```ini
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_actual_mysql_password
MYSQL_DATABASE=dbms_learn_run
```

### 2. Initialize the Database and Sample Data
Run the automated initialization script from PowerShell:
```powershell
python init_db.py --password your_actual_mysql_password
```
*(Or simply `python init_db.py` if you already saved your password in `.env`)*

This script automatically executes:
- `01_create_database.sql`
- `02_create_tables.sql`
- `03_insert_sample_data.sql`
- `04_views.sql`
- `05_triggers.sql`

And displays the exact row counts for all tables!

#### Alternative: Import via MySQL Workbench or CLI
You can also open **MySQL Workbench 8.0**, connect to `localhost:3306`, and open and execute the SQL scripts in order from the `database/` folder:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < database\01_create_database.sql
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p dbms_learn_run < database\02_create_tables.sql
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p dbms_learn_run < database\03_insert_sample_data.sql
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p dbms_learn_run < database\04_views.sql
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p dbms_learn_run < database\05_triggers.sql
```

### 3. Run the Automated Tests
Verify that all unit tests pass:
```powershell
python -m unittest discover tests
```

### 4. Start the Application
Launch the Flask development server:
```powershell
python app.py
```
Open your browser and visit: **`http://localhost:5000`**

---

## Phase 1 Deliverables Summary

- [x] Flask project configured with security limits and environment variables.
- [x] MySQL 8.0 connection module with connection testing and execution timing.
- [x] All 6 SQL scripts written in `database/` (Database, 8 Tables, Sample Data, Views, Triggers, Practice Queries).
- [x] `init_db.py` automated script for Windows database setup.
- [x] GeeksforGeeks-inspired responsive dashboard with 16-topic syllabus navigation sidebar.
- [x] Real-time MySQL connection indicator badge and diagnostic test modal.
- [x] Live SQL Execution Laboratory with query runner, execution timer, row counter, and table renderer.
- [x] Schema Inspector page displaying columns, types, primary keys, foreign keys, and nullability for all 8 tables.
- [x] Comprehensive unit tests in `tests/test_database.py` and `tests/test_sql_lab.py`.

---

## Phase 2 Deliverables Summary &mdash; Introduction to DBMS (NEPC42)

Access the live module at: **`http://localhost:5000/phase-2`** (or alias **`/module-1`**)

- [x] **Dedicated Phase 2 Learning Dashboard:**
  - Modern, responsive GeeksforGeeks-inspired interface with sticky topic navigation pills and previous/next controls.
  - Interactive learning objectives, estimated study time (~110 mins), and dynamic completion badges.
  - Browser `localStorage` progress tracking with visual progress bar (0%–100%) and reset option.
- [x] **Topic 1 — Database System Architecture:**
  - Request-response lifecycle explained with a real-world student exam results check walkthrough.
  - Detailed explanations and custom responsive SVG diagrams for **1-Tier**, **2-Tier (Fat Client)**, and **3-Tier** architectures.
  - Comprehensive 9-dimension comparison table (scalability, security, maintenance, flow, placement, complexity).
  - Introduction to major internal database components (Query Processor, Storage Manager, Transaction Manager, Files, B+ Tree Indexes, Data Dictionary, DBA role).
- [x] **Topic 2 — Data Models:**
  - In-depth coverage of **Hierarchical** (tree-based), **Network** (graph-based), **Relational** (table-based), **Entity-Relationship** (conceptual planning), and **Object-Oriented** data models.
  - Clean illustrative SVG diagrams for College tree, Course-Student network sets, Relational tables, Conceptual ER, and OO Student class.
  - Comprehensive comparative analysis across all 5 models and practical scenario-based decision guide.
- [x] **Topic 3 — Three-Schema Architecture (ANSI/SPARC):**
  - Thorough explanation of the three levels of abstraction: **External (View)**, **Conceptual (Logical)**, and **Internal (Physical)**.
  - Multi-user view examples (Student Portal, Faculty Roster, Accounts Ledger) over a single underlying database.
  - External-to-Conceptual and Conceptual-to-Internal schema mappings with two-way query resolution flow diagram.
  - Dedicated clarification addressing the #1 student misconception: **Three-Schema Architecture vs. Three-Tier Application Architecture** with side-by-side contrast.
- [x] **Topic 4 — Data Independence & Interactive Simulation:**
  - Clear distinctions between **Physical Data Independence** (internal schema changes) and **Logical Data Independence** (conceptual schema changes).
  - Before-and-after B+ Tree index acceleration walkthrough.
  - **Live Interactive Simulator:** Interactive sandbox allowing students to test 5 real-world scenarios (Index creation, NVMe SSD migration, new column addition, new table creation, entity splitting with view mapping) with dynamic visual node updates.
- [x] **Interactive Quizzes & Exam Prep:**
  - 4 comprehensive quizzes (20 questions total) featuring immediate technical feedback and explanations for correct and incorrect answers.
  - University examination preparation accordions containing model answers for 2-mark, 5-mark, and 10-mark questions.
- [x] **Integration & Quality:**
  - Seamlessly links to and from the main dashboard, sidebar, and top navigation.
  - Preserves Phase 3 SQL Laboratory, Schema Inspector, and all REST API endpoints.
  - Functions completely offline even if MySQL Server is temporarily unauthenticated or down.
  - 100% automated test coverage in `tests/test_phase2.py` (17 tests total passing).

---

## Phase 3 Deliverables Summary &mdash; SQL & Relational Queries (NEPC42)

Access the live module at: **`http://localhost:5000/phase-3`** (or alias **`/sql-lab`**)

- [x] **Dedicated Phase 3 Learning Dashboard:**
  - Modern, responsive GeeksforGeeks-inspired interface with sticky topic navigation pills across all 10 topics.
  - Interactive learning objectives, estimated study time (~150 mins), and dynamic completion badges.
  - Browser `localStorage` progress tracking with visual progress bar (0%–100%) and reset option.
  - Embedded **Interactive SQL Laboratory** connected live to MySQL 8 with query runner, execution timer, row counter, presets dropdown, and safe error renderer.
- [x] **Topic 1 &mdash; Data Definition Language (DDL):**
  - Database, table, and column structural definitions.
  - Syntax, examples, and behavior for `CREATE DATABASE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, and `TRUNCATE TABLE`.
  - Comprehensive integrity constraints guide (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `DEFAULT`, `CHECK`).
  - Critical warning on MySQL implicit commits for DDL statements.
  - Isolated testing on the dedicated `practice_students` table.
- [x] **Topic 2 &mdash; Data Manipulation Language (DML):**
  - Data modifications with `INSERT` (single-row and multi-row), `UPDATE`, and `DELETE`.
  - The dangers of omitting a `WHERE` clause and server-side safeguards against accidental mass modifications.
  - Transaction autocommit behavior across InnoDB storage engine tables.
- [x] **Topic 3 &mdash; Data Query Language (DQL):**
  - Deep-dive into `SELECT`, column projections, and aliases with `AS`.
  - Logical Query Processing Order pipeline: `FROM` &rarr; `JOIN` &rarr; `WHERE` &rarr; `GROUP BY` &rarr; `HAVING` &rarr; `SELECT` &rarr; `DISTINCT` &rarr; `ORDER BY` &rarr; `LIMIT`.
  - Comparison operators, boolean logic (`AND`, `OR`, `NOT`), `BETWEEN`, `IN`, `LIKE` wildcards (`%`, `_`), and three-valued logic for `NULL`.
- [x] **Topic 4 &mdash; INNER JOIN:**
  - Concept of relational matching and intersection with custom SVG Venn diagram.
  - Dissecting `ON` (table linking predicate) vs. `WHERE` (row filter).
  - Executable query linking `students` and `departments` demonstrating exclusion of unmatched Civil Engineering.
- [x] **Topic 5 &mdash; LEFT JOIN:**
  - Preservation of all records from the left table and populating missing right-side values with `NULL`.
  - Clean SVG Venn diagram showing left circle inclusion.
  - Executable query identifying departments with zero enrolled students.
  - Anti-join pattern using `WHERE right_table.id IS NULL`.
- [x] **Topic 6 &mdash; RIGHT JOIN:**
  - Preservation of all records from the right table and comparison with reversing table order in a `LEFT JOIN`.
  - SVG Venn diagram showing right circle inclusion.
  - Executable query identifying `Event 6` (Cybersecurity Summit) which has zero student registrations.
- [x] **Topic 7 &mdash; SELF JOIN:**
  - Joining a table to itself using mandatory table aliases.
  - SVG hierarchical tree diagram modeling student-mentor relationships.
  - Executable query pairing senior student mentors with junior student mentees via `mentor_id`.
- [x] **Topic 8 &mdash; CROSS JOIN & 5-Join Matrix:**
  - Cartesian product definition and cardinality formula: $|A| \times |B|$.
  - Catastrophic performance warning on accidental cross joins (e.g. 10k &times; 10k = 100M rows).
  - Multi-dimensional 5-join matrix comparing syntax, preserved rows, NULL behavior, and practical use cases.
- [x] **Topic 9 &mdash; Aggregate Functions, GROUP BY & HAVING:**
  - Multi-row calculations using `COUNT(*)`, `COUNT(col)`, `COUNT(DISTINCT)`, `SUM()`, `AVG()`, `MIN()`, and `MAX()`.
  - Automatic exclusion of `NULL` values in aggregation.
  - Visual row-clustering diagram showing how raw rows partition into grouped buckets.
  - Clear architectural breakdown: `WHERE` (filters rows before grouping) vs `HAVING` (filters groups after aggregation).
  - MySQL 8 `ONLY_FULL_GROUP_BY` SQL mode compliance.
- [x] **Topic 10 &mdash; Nested Subqueries:**
  - Classification by cardinality: scalar subqueries (1x1), multi-row subqueries (`IN`, `ANY`, `ALL`), and derived tables in `FROM` (mandatory aliases).
  - Non-correlated subqueries (evaluate once) vs correlated subqueries (re-evaluate per outer row).
  - Correlated subqueries with `EXISTS` and `NOT EXISTS` and immunity from the famous `NOT IN (NULL)` trap.
  - Architectural tradeoffs: Subqueries vs JOINs.
- [x] **Interactive Assessments & Safeguards:**
  - 10 interactive topic quizzes (30 multiple-choice questions total) with instant validation and technical explanations.
  - Collapsible practice exercises with progressive hints and one-click solution loading into the SQL Laboratory.
  - Server-side DDL protection blocking `DROP`/`TRUNCATE` on core curriculum tables.
  - One-click `Reset Practice Table` endpoint (`/api/reset-practice-table`) to restore `practice_students` to 5 seed records.
- [x] **Testing & Verification:**
  - Comprehensive test suite in `tests/test_phase3.py` (14 new automated tests).
  - 100% test pass rate across all 31 unit tests (`python -m unittest discover tests`).

---

## Phase 4 Deliverables Summary &mdash; Views, Triggers & Security (NEPC42)

Access the live module at: **`http://localhost:5000/phase-4`** (or alias **`/views-triggers`**)

- [x] **Dedicated Phase 4 Learning Module & Sticky Navigation:**
  - Clean, responsive layout with sticky topic navigation pills across all 5 syllabus topics (`views`, `triggers`, `constraints`, `procedures`, `security`).
  - Browser `localStorage` progress tracking with dynamic progress bar (0%–100%) and 5 topic status indicators.
  - Estimated study time (~135 mins) with Prev / Next footer navigation controls.
  - Safe live laboratories connected directly to MySQL 8 with isolated sandbox tables.

- [x] **Topic 1 &mdash; Views & Updatable Views:**
  - Virtual table concepts, data abstraction, external schema level mapping, and disk storage comparison (0 bytes of row data vs physical base tables).
  - SQL commands: `CREATE VIEW`, `CREATE OR REPLACE VIEW`, `SHOW CREATE VIEW`, `DROP VIEW`, and `SELECT` through views.
  - Updatability criteria: 1:1 mapping requirements, rules on single base table, why aggregate functions (`AVG`, `SUM`), `GROUP BY`, `DISTINCT`, and calculated columns invalidate updatability.
  - Detailed explanation of `WITH CHECK OPTION` and its role in preventing out-of-predicate inserts and updates.
  - **Live Interactive View Laboratory:**
    - Live **View Inspector** querying `SHOW CREATE VIEW` and displaying live preview rows from `vw_student_mentorship`, `vw_department_statistics`, `vw_event_occupancy`, `vw_practice_students`, and `vw_practice_honor_students`.
    - **Updatable View DML Sandbox:** Test permitted updates through `vw_practice_students` vs. rejected updates violating `WITH CHECK OPTION` (`ERROR 1369: CHECK OPTION failed`).

- [x] **Topic 2 &mdash; BEFORE and AFTER Triggers:**
  - Event-driven database programming concepts, trigger lifecycle, and comparison with application-level validation.
  - Complete coverage of all 6 trigger permutations: `BEFORE INSERT`, `AFTER INSERT`, `BEFORE UPDATE`, `AFTER UPDATE`, `BEFORE DELETE`, and `AFTER DELETE`.
  - Pseudorecords availability matrix: `NEW` and `OLD` access across `INSERT`, `UPDATE`, and `DELETE`.
  - `DELIMITER` client command explanation, `SIGNAL SQLSTATE '45000'` error raising, and the MySQL Error 1442 mutating-table restriction.
  - **Live Interactive Trigger Laboratory:**
    - Test **BEFORE INSERT Capacity Enforcement** (`trg_check_event_capacity`) on an overbooked workshop event, observing transaction abort and error message.
    - Test **AFTER INSERT Security Audit Logging** (`trg_audit_new_registration`) and inspect live records generated in `registration_audit`.

- [x] **Topic 3 &mdash; Relational Database Constraints:**
  - Declarative data integrity vs procedural application code.
  - Comprehensive coverage of `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `CHECK`, and `DEFAULT`.
  - Deep-dive into PRIMARY KEY vs UNIQUE constraint differences regarding NULL values in MySQL InnoDB.
  - Foreign key referential actions: `CASCADE`, `RESTRICT` / `NO ACTION`, and `SET NULL`.
  - MySQL 8.0+ strict enforcement of `CHECK` constraints (contrast with MySQL 5.7 ignored check syntax).
  - Distinction between `DEFAULT` fallback values and `NOT NULL` constraints.
  - **Live Interactive Constraint Laboratory:**
    - Dedicated test buttons for 6 scenarios: Duplicate Primary Key (`duplicate_pk`), Duplicate Unique Roll No (`duplicate_unique`), Missing Required First Name (`not_null_violation`), Out-of-Range GPA (`check_violation`), Nonexistent Department Reference (`fk_violation`), and Successful DEFAULT Fallback (`default_test`).
    - Real-time display of attempted SQL, MySQL error codes (Error 1062, Error 1048, Error 3819, Error 1452), and educational explanations.

- [x] **Topic 4 &mdash; MySQL Stored Procedures:**
  - Procedural programming inside the database catalog: reduced network traffic, precompiled execution plans, and security encapsulation.
  - Comparison between Stored Procedures (`CALL`, 0-to-many result sets, `OUT` parameters) and User-Defined Functions (`RETURN` scalar, embeddable in expressions).
  - Parameter modes: `IN`, `OUT`, and `INOUT`. Local variable declaration (`DECLARE`, `SET`) and conditional branching (`IF ... THEN ... ELSE`).
  - Pre-installed routines in `database/08_stored_procedures.sql`:
    1. `sp_get_students_by_department(IN dept_code)`
    2. `sp_get_event_roster(IN event_id)`
    3. `sp_calculate_dept_gpa(IN dept_code, OUT avg_gpa, OUT student_count)`
    4. `sp_register_student_safe(IN student_id, IN event_id, OUT status, OUT message)`
  - **Live Interactive Stored Procedure Laboratory:**
    - Interactive procedure caller with parameter inputs, executing `CALL sp(...)` against live MySQL and rendering returned multi-row tabular results or `OUT` parameters with execution timing.

- [x] **Topic 5 &mdash; Authorization, Roles & Database Security:**
  - Authentication ("Who are you?") vs Authorization ("What can you do?").
  - Account format `'username'@'hostname'` and the Principle of Least Privilege (PoLP).
  - DCL statements: `CREATE USER`, `GRANT`, `REVOKE`, `SHOW GRANTS`, and privilege scopes (Global, Database, Table, Column).
  - MySQL 8 native Roles: creating roles, granting privileges to roles, granting roles to accounts, and role activation (`SET DEFAULT ROLE`).
  - Defense-in-depth: dynamic SQL string concatenation vulnerability vs. secure parameterized queries (`%s`), credentials protection via `.env`, and auditability.
  - **Interactive Role-Based Access Control (RBAC) Sandbox:**
    - Simulation interface allowing students to switch between roles (`student_portal`, `event_coordinator`, `db_admin`) and test operations against the privilege matrix, inspecting simulated MySQL access decisions (`PERMISSION GRANTED` vs. `ERROR 1142: command denied`).

- [x] **Interactive Assessments & Practice:**
  - 5 interactive knowledge check quizzes (15 multiple-choice questions total) with instant validation and technical explanations.
  - 10 practice exercises with revealable hints and full SQL solutions.
  - Isolated sandbox reset endpoint (`/api/reset-practice`) to safely restore practice tables and views without modifying core learning tables.

- [x] **Testing & Verification:**
  - Full automated test suite in `tests/test_phase4.py` (8 new test methods covering routes, API endpoints, triggers, constraints, views, and procedures).
  - 100% test pass rate across all 39 unit tests in the project (`python -m unittest discover tests`).

---

## Phase 5 Deliverables Summary &mdash; Database Design & Normalization (NEPC42)

Access the live module at: **`http://localhost:5000/phase-5`** (or alias **`/normalization`**)

- [x] **Dedicated Phase 5 Learning Module & Sticky Navigation:**
  - Modern, responsive GeeksforGeeks-inspired interface with sticky topic navigation pills across all 10 syllabus lessons (`intro`, `fds`, `axioms`, `1nf`, `2nf`, `3nf`, `bcnf`, `comparison`, `lossless`, `practice-lab`).
  - Dual progress tracking: browser `localStorage` + server-side MySQL persistence via `phase5_learning_progress` table.
  - Visual progress bar (0%&ndash;100%), 10 lesson status badges with dynamic quiz scores, and Previous / Next footer navigation controls.
  - Estimated study time (~240 mins) for diploma and degree curriculum mastery.

- [x] **Lesson 1 &mdash; Introduction to Database Design &amp; Modification Anomalies:**
  - Core objectives of database design and relational modeling.
  - Pitfalls of poorly designed "flat" tables: data redundancy, wasted storage, and data inconsistency.
  - Concrete worked example: Student-Course registration table (`StudentID`, `StudentName`, `CourseID`, `CourseName`, `Instructor`) with students Amit and Neha, instructors Sharma and Patil.
  - Comprehensive breakdown of anomalies:
    - **Insertion Anomaly:** Inability to add a new course without enrolling a student (violating Entity Integrity with NULL PK).
    - **Update Anomaly:** Modifying an instructor across multiple student records risking inconsistent state.
    - **Deletion Anomaly:** Erasing a student inadvertently deleting the university's only record of a course offering.
  - **Interactive Anomaly Investigator Tool:** Interactive buttons to trigger and inspect highlighted anomaly scenarios.

- [x] **Lesson 2 &mdash; Functional Dependencies &amp; Domain Business Rules:**
  - Formal definition: $X \to Y$ (Determinant $X$ and Dependent $Y$).
  - Critical domain principle: Functional dependencies cannot be derived merely from sample rows; they represent enterprise domain rules and semantic specifications.
  - Classification of functional dependencies:
    - **Trivial:** $Y \subseteq X$ (holds by definition).
    - **Non-Trivial:** $Y \not\subseteq X$.
    - **Full:** Dependent relies on the entire composite key.
    - **Partial:** Dependent relies on a proper subset of a candidate key.
    - **Transitive:** Non-key attribute determines another non-key attribute ($X \to Y \to Z$).
  - **Interactive Functional Dependency Explorer:** Live interactive widget allowing students to switch schemas (`STUDENT`, `ENROLLMENT`) and inspect determinants, dependents, candidate keys, and normalization implications.

- [x] **Lesson 3 &mdash; Armstrong's Axioms &amp; Inference Rules:**
  - Fundamental Armstrong's Axioms:
    - **Reflexivity:** If $Y \subseteq X$, then $X \to Y$.
    - **Augmentation:** If $X \to Y$, then $XZ \to YZ$.
    - **Transitivity:** If $X \to Y$ and $Y \to Z$, then $X \to Z$.
  - Derived Secondary Rules:
    - **Union (Additive):** If $X \to Y$ and $X \to Z$, then $X \to YZ$.
    - **Decomposition (Projective):** If $X \to YZ$, then $X \to Y$ and $X \to Z$.
    - **Pseudotransitivity:** If $X \to Y$ and $WY \to Z$, then $WX \to Z$.
  - Mathematical notation, plain-English explanations, and real-world database examples for every rule.
  - Mathematical property: Armstrong's axioms are both **Sound** and **Complete**.
  - **Interactive Armstrong Axiom Derivation Tool:** Live derivation explorer with step-by-step reasoning.

- [x] **Lesson 4 &mdash; First Normal Form (1NF) &amp; Attribute Atomicity:**
  - Definition: All attribute values must be atomic (indivisible) with no repeating groups or multivalued columns.
  - The danger of comma-separated strings (`Courses = 'DBMS, Python'`): query complexity, inability to enforce foreign keys, and absence of B-Tree indexing.
  - Before-and-after table transformation: converting multivalued fields into distinct rows and separate bridge relations.
  - Clarification on atomicity: Atomicity depends on domain business meaning, not merely word or character length.

- [x] **Lesson 5 &mdash; Second Normal Form (2NF) &amp; Partial Dependencies:**
  - Definition: Must be in 1NF and have **no partial functional dependencies** for any non-prime attribute.
  - Core concepts: Candidate keys, composite keys, prime attributes vs. non-prime attributes.
  - Special theorem: If all candidate keys consist of single attributes, the relation is automatically in 2NF!
  - Canonical worked decomposition:
    - Unnormalized: `ENROLLMENT(StudentID, CourseID, StudentName, CourseName, Grade)`
    - Dependencies: `{StudentID, CourseID} -> Grade`, `StudentID -> StudentName`, `CourseID -> CourseName`
    - Identified partial dependencies and decomposition into `STUDENT`, `COURSE`, and `ENROLLMENT`.

- [x] **Lesson 6 &mdash; Third Normal Form (3NF) &amp; Transitive Dependencies:**
  - Intuitive definition: Must be in 2NF and have no transitive functional dependencies.
  - Formal Codd & Zaniolo 3NF Condition: For every non-trivial $X \to A$, either:
    1. $X$ is a **superkey**, OR
    2. $A$ is a **prime attribute** (member of some candidate key).
  - Decomposition: `STUDENT(StudentID, StudentName, DepartmentID, DepartmentName)` decomposed into `STUDENT(StudentID, StudentName, DepartmentID)` and `DEPARTMENT(DepartmentID, DepartmentName)`.

- [x] **Lesson 7 &mdash; Boyce-Codd Normal Form (BCNF) &amp; Superkey Enforcements:**
  - Why BCNF is stricter than 3NF: Every determinant $X$ in a non-trivial dependency $X \to A$ must be a superkey (no prime-attribute escape clause).
  - Canonical 3NF-but-not-BCNF case study:
    - Schema: `STUDENT_ADVISING(Student, Course, Instructor)`
    - FDs: `{Student, Course} -> Instructor`, `Instructor -> Course`
    - Candidate Keys: `{Student, Course}` and `{Student, Instructor}`. All attributes are prime.
    - 3NF check: `Instructor -> Course` satisfies 3NF because `Course` is prime!
    - BCNF check: `Instructor -> Course` violates BCNF because `Instructor` is NOT a superkey.
    - BCNF Decomposition: `INSTRUCTOR_ASSIGNMENT(Instructor, Course)` and `STUDENT_INSTRUCTOR(Student, Instructor)`.
    - Trade-off analysis: Decomposition is lossless, but `{Student, Course} -> Instructor` is lost!

- [x] **Lesson 8 &mdash; Comparative Matrix: 1NF vs. 2NF vs. 3NF vs. BCNF:**
  - Concentric nesting hierarchy: Relations $\supset$ 1NF $\supset$ 2NF $\supset$ 3NF $\supset$ BCNF.
  - Comprehensive 5-column comparison table covering core requirements, targeted dependencies, canonical example violations, and decomposition strategies.
  - Real-world database engineering realities: Normalization vs. Denormalization, OLTP (high normalization) vs. OLAP/Data Warehousing (star schemas), and the mnemonic: *"The key, the whole key (2NF), and nothing but the key (3NF), so help me Codd!"*

- [x] **Lesson 9 &mdash; Lossless Join Decomposition &amp; Dependency Preservation:**
  - Lossless (non-additive) join definition: $R_1 \bowtie R_2 \bowtie \dots \bowtie R_k = R$.
  - Spurious tuples demonstration: joining lossy tables hallucinating false rows.
  - Binary Lossless Join Theorem: Decomposition into $(R_1, R_2)$ is lossless iff $(R_1 \cap R_2) \to R_1$ or $(R_1 \cap R_2) \to R_2$ in $F^+$.
  - Dependency preservation definition: $(F_1 \cup F_2 \cup \dots \cup F_k)^+ = F^+$ and its impact on single-table integrity enforcement vs. multi-table join triggers.
  - **Live Interactive Decomposition Verifier Widget:** Connects to `/api/normalization/verify-decomposition` to verify attribute preservation, binary lossless join test, and dependency preservation.

- [x] **Lesson 10 &mdash; Interactive Normalization Practice Lab:**
  - 5 comprehensive real-world case studies:
    1. **Case 1: Student Courses & Departments** (`STUDENT_ENROLLMENT`, 1NF $\to$ 3NF)
    2. **Case 2: Corporate Employee Projects** (`EMP_PROJECT_HOURS`, 1NF $\to$ 3NF)
    3. **Case 3: Hospital Clinic Patient Visits** (`HOSPITAL_VISIT`, 2NF $\to$ 3NF)
    4. **Case 4: Academic Advising** (`COLLEGE_ADVISING`, 3NF $\to$ BCNF with dependency trade-off)
    5. **Case 5: E-Commerce Orders & Line Items** (`ORDER_LINE_ITEMS`, Full Pipeline)
  - Guided 4-step workflow per case:
    - Step 1: Candidate Key Identification
    - Step 2: Partial vs. Transitive Dependency Classification
    - Step 3: Determine Highest Normal Form
    - Step 4: Decomposed Schema Review & Mathematical Guarantees Verification
  - Revealable model solutions and one-click reset for every case study.

- [x] **Interactive Assessments & Safeguards:**
  - 10 interactive knowledge check quizzes (30 multiple-choice questions total) with instant technical explanations.
  - 20 practice exercises with collapsible hints and full step-by-step solutions.
  - Safe mathematical algorithms for attribute closures ($X^+$) and binary decomposition testing.
  - Zero modification to real application tables &mdash; educational data is isolated.

- [x] **Testing & Verification:**
  - 11 comprehensive automated tests in `tests/test_phase5.py`.
  - **100% test pass rate across all 50 unit tests in the project (`python -m unittest discover tests`).**


