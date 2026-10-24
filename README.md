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
│   └── 06_practice_queries.sql # Ready-to-run queries mapped to syllabus
│
├── templates/                  # Jinja2 Templates
│   ├── base.html               # Main layout with 16-topic syllabus sidebar
│   ├── index.html              # Live dashboard & interactive SQL runner
│   ├── schema.html             # Relational schema inspector (8 tables)
│   ├── phase2.html             # Phase 2 Learning Module container
│   └── phase2/                 # Modular syllabus topic partials
│       ├── topic1_architecture.html     # Topic 1: Database System Architecture
│       ├── topic2_data_models.html      # Topic 2: Data Models (Hierarchical, Relational, etc.)
│       ├── topic3_three_schema.html     # Topic 3: Three-Schema Architecture (ANSI/SPARC)
│       └── topic4_data_independence.html # Topic 4: Physical & Logical Data Independence
│
├── static/                     # Static assets
│   ├── css/style.css           # GeeksforGeeks-inspired styling + Phase 2 styles
│   └── js/
│       ├── app.js              # Dynamic query execution & output rendering
│       └── phase2.js           # Progress tracking, quizzes & data independence simulator
│
└── tests/                      # Automated test suite
    ├── test_database.py        # Database helper & serialization tests
    ├── test_sql_lab.py         # SQL parsing & safety tests
    └── test_phase2.py          # Phase 2 routes, topics, quizzes, and regression tests
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
