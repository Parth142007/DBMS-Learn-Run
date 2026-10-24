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
│   └── 07_practice_table.sql   # Isolated practice_students sandbox table
│
├── templates/                  # Jinja2 Templates
│   ├── base.html               # Main layout with 16-topic syllabus sidebar & Phase 3 links
│   ├── index.html              # Live dashboard & interactive SQL runner
│   ├── schema.html             # Relational schema inspector (8 tables)
│   ├── phase2.html             # Phase 2 Learning Module container
│   ├── phase2/                 # Modular Phase 2 topic partials (Topics 1-4)
│   ├── phase3.html             # Phase 3 Learning Dashboard & SQL Lab container
│   └── phase3/                 # Modular Phase 3 topic partials (Topics 1-10)
│       ├── topic1_ddl.html         # Topic 1: DDL (CREATE, ALTER, DROP, TRUNCATE, constraints)
│       ├── topic2_dml.html         # Topic 2: DML (INSERT, UPDATE, DELETE, autocommit)
│       ├── topic3_dql.html         # Topic 3: DQL (SELECT, filtering, execution pipeline)
│       ├── topic4_inner_join.html  # Topic 4: INNER JOIN (Intersection & matching rows)
│       ├── topic5_left_join.html   # Topic 5: LEFT JOIN (Left preservation & anti-joins)
│       ├── topic6_right_join.html  # Topic 6: RIGHT JOIN (Right preservation)
│       ├── topic7_self_join.html   # Topic 7: SELF JOIN (Student mentorship hierarchy)
│       ├── topic8_cross_join.html  # Topic 8: CROSS JOIN (Cartesian & 5-join matrix)
│       ├── topic9_aggregates.html  # Topic 9: Aggregates, GROUP BY & HAVING
│       └── topic10_subqueries.html # Topic 10: Nested Subqueries (Scalar, Multi-row, Correlated)
│
├── static/                     # Static assets
│   ├── css/style.css           # Styling for tabs, diagrams, and code snippets
│   └── js/
│       ├── app.js              # Dynamic query execution & output rendering
│       ├── phase2.js           # Phase 2 progress, quizzes & simulator
│       └── phase3.js           # Phase 3 SQL Lab, tab routing, quizzes & table reset
│
└── tests/                      # Automated test suite (31 tests passing)
    ├── test_database.py        # Database helper & serialization tests
    ├── test_sql_lab.py         # SQL parsing & safety tests
    ├── test_phase2.py          # Phase 2 routes, topics, quizzes, and regression tests
    └── test_phase3.py          # Phase 3 routes, 10 topics, joins, aggregates, subqueries, safeguards
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
