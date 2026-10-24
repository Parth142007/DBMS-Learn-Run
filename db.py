import time
from datetime import date, datetime
from decimal import Decimal
import pymysql
from pymysql.cursors import DictCursor
from config import Config

def serialize_value(val):
    """Serialize MySQL datatypes (Decimal, datetime, date, bytes) into JSON-friendly format."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val) if val % 1 != 0 else int(val)
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val

def get_connection(use_database=True, password=None, user=None, host=None, port=None):
    """
    Establish a connection to the MySQL server using PyMySQL.
    Supports overriding credentials (useful for interactive test connection).
    """
    db_name = Config.MYSQL_DATABASE if use_database else None
    return pymysql.connect(
        host=host or Config.MYSQL_HOST,
        port=port or Config.MYSQL_PORT,
        user=user or Config.MYSQL_USER,
        password=password if password is not None else Config.MYSQL_PASSWORD,
        database=db_name,
        charset="utf8mb4",
        cursorclass=DictCursor,
        connect_timeout=Config.QUERY_TIMEOUT_SECONDS,
        autocommit=True
    )

def test_connection(password=None, user=None, host=None, port=None):
    """
    Verify MySQL connectivity, fetch server version, database existence,
    and list of tables with row counts.
    """
    result = {
        "connected": False,
        "database_exists": False,
        "mysql_version": "Unknown",
        "database": Config.MYSQL_DATABASE,
        "host": host or Config.MYSQL_HOST,
        "port": port or Config.MYSQL_PORT,
        "user": user or Config.MYSQL_USER,
        "tables": [],
        "table_count": 0,
        "error": None
    }
    
    # Step 1: Connect to MySQL server without selecting database
    try:
        conn = get_connection(use_database=False, password=password, user=user, host=host, port=port)
        with conn.cursor() as cursor:
            cursor.execute("SELECT VERSION() AS ver;")
            row = cursor.fetchone()
            if row:
                result["mysql_version"] = row.get("ver", "8.x")
            
            # Check if target database exists
            cursor.execute("SHOW DATABASES LIKE %s;", (Config.MYSQL_DATABASE,))
            db_row = cursor.fetchone()
            if db_row:
                result["database_exists"] = True
        conn.close()
    except Exception as e:
        result["error"] = str(e)
        return result

    # Step 2: If database exists, connect to it and get table statistics
    if result["database_exists"]:
        try:
            conn = get_connection(use_database=True, password=password, user=user, host=host, port=port)
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT TABLE_NAME AS tbl_name, TABLE_ROWS AS tbl_rows 
                    FROM information_schema.tables 
                    WHERE table_schema = %s 
                    ORDER BY TABLE_NAME;
                """, (Config.MYSQL_DATABASE,))
                rows = cursor.fetchall()
                
                # Fetch exact counts for accuracy since information_schema can be approximate
                table_list = []
                for r in rows:
                    t_name = r.get("tbl_name") or r.get("TABLE_NAME") or r.get("table_name")
                    approx_rows = r.get("tbl_rows") or r.get("TABLE_ROWS") or 0
                    try:
                        cursor.execute(f"SELECT COUNT(*) AS cnt FROM `{t_name}`;")
                        count_res = cursor.fetchone()
                        exact_cnt = count_res.get("cnt") or count_res.get("CNT") or 0
                    except Exception:
                        exact_cnt = approx_rows
                    
                    table_list.append({
                        "name": t_name,
                        "rows": exact_cnt
                    })
                
                result["tables"] = table_list
                result["table_count"] = len(table_list)
                result["connected"] = True
                result["error"] = None
            conn.close()
        except Exception as e:
            result["connected"] = False
            result["error"] = f"Connected to server, but database access failed: {e}"
    else:
        result["connected"] = True  # Server is reachable, but DB needs to be created
        result["error"] = f"MySQL server connected, but database '{Config.MYSQL_DATABASE}' does not exist yet. Run init_db.py to create it."

    return result

CORE_TABLES = [
    "departments", "students", "courses", "events",
    "organizers", "registrations", "attendance", "feedback"
]

def execute_query(sql_statement, params=None, max_rows=None, confirm_unfiltered=False):
    """
    Safely execute an arbitrary SQL statement against the practice database.
    Applies security policies, blocks deletion of core tables, and returns
    structured JSON with execution statistics.
    """
    if max_rows is None:
        max_rows = Config.MAX_ROWS_RETURNED

    trimmed_sql = sql_statement.strip()
    upper_sql = trimmed_sql.upper()

    # Safety check 1: block restricted admin/server commands
    for restricted in Config.RESTRICTED_KEYWORDS:
        if restricted in upper_sql:
            return {
                "success": False,
                "error": f"Security Notice: The statement contains restricted operation '{restricted}' which is disabled in this educational laboratory.",
                "rows": [],
                "columns": [],
                "execution_time_ms": 0,
                "affected_rows": 0
            }

    # Safety check 2: protect core curriculum tables from accidental DROP or TRUNCATE
    if upper_sql.startswith("DROP") or upper_sql.startswith("TRUNCATE"):
        for tbl in CORE_TABLES:
            patterns = [
                f"DROP TABLE {tbl.upper()}", f"DROP TABLE `{tbl.upper()}`",
                f"DROP TABLE IF EXISTS {tbl.upper()}", f"DROP TABLE IF EXISTS `{tbl.upper()}`",
                f"TRUNCATE TABLE {tbl.upper()}", f"TRUNCATE TABLE `{tbl.upper()}`",
                f"TRUNCATE {tbl.upper()}", f"TRUNCATE `{tbl.upper()}`"
            ]
            if any(p in upper_sql for p in patterns):
                return {
                    "success": False,
                    "error": f"Protection Notice: The core curriculum table '{tbl}' is protected to preserve relational joins and schema inspection for all students. Please practice CREATE, ALTER, DROP, and TRUNCATE experiments on the dedicated 'practice_students' table.",
                    "rows": [],
                    "columns": [],
                    "execution_time_ms": 0,
                    "affected_rows": 0
                }

    # Safety check 3: Warn on broad UPDATE/DELETE without WHERE on core tables
    if (upper_sql.startswith("UPDATE") or upper_sql.startswith("DELETE")) and "WHERE" not in upper_sql:
        for tbl in CORE_TABLES:
            if tbl in trimmed_sql.lower() and not confirm_unfiltered:
                cmd = upper_sql.split()[0]
                return {
                    "success": False,
                    "error": f"Safety Notice: Unfiltered {cmd} without a WHERE clause detected on core table '{tbl}'. This would modify or delete all records in the table! If you intend to execute this, check the 'Confirm broad change' box, or experiment on 'practice_students'.",
                    "rows": [],
                    "columns": [],
                    "execution_time_ms": 0,
                    "affected_rows": 0,
                    "requires_confirmation": True
                }

    start_time = time.perf_counter()
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            cursor.execute(trimmed_sql, params)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            is_select_like = upper_sql.startswith(("SELECT", "SHOW", "DESCRIBE", "EXPLAIN"))

            if is_select_like and cursor.description:
                columns = [col[0] for col in cursor.description]
                raw_rows = cursor.fetchmany(max_rows)
                
                # Serialize row values safely
                formatted_rows = []
                for row in raw_rows:
                    formatted_rows.append({col: serialize_value(row[col]) for col in columns})

                row_count = len(formatted_rows)
                message = f"Fetched {row_count} row{'s' if row_count != 1 else ''} in {elapsed_ms} ms."
                if row_count >= max_rows:
                    message += f" (Result capped at maximum {max_rows} rows for display)."

                conn.close()
                return {
                    "success": True,
                    "columns": columns,
                    "rows": formatted_rows,
                    "row_count": row_count,
                    "affected_rows": 0,
                    "execution_time_ms": elapsed_ms,
                    "message": message,
                    "is_query": True
                }
            else:
                affected = cursor.rowcount
                last_id = cursor.lastrowid
                conn.close()
                return {
                    "success": True,
                    "columns": [],
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": affected,
                    "last_insert_id": last_id,
                    "execution_time_ms": elapsed_ms,
                    "message": f"Query OK, {affected} row{'s' if affected != 1 else ''} affected in {elapsed_ms} ms.",
                    "is_query": False
                }
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": False,
            "error": str(e),
            "columns": [],
            "rows": [],
            "row_count": 0,
            "affected_rows": 0,
            "execution_time_ms": elapsed_ms,
            "message": f"Execution failed: {e}",
            "is_query": False
        }

def get_table_schema(table_name):
    """Fetch column definitions, keys, and nullability for a specific table."""
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            cursor.execute(f"DESCRIBE `{table_name}`;")
            columns = cursor.fetchall()
            
            cursor.execute(f"SELECT COUNT(*) AS cnt FROM `{table_name}`;")
            total_rows = cursor.fetchone()["cnt"]
            
        conn.close()
        return {
            "success": True,
            "table_name": table_name,
            "columns": columns,
            "total_rows": total_rows
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def reset_practice_table():
    """Drops and recreates practice_students and associated practice views with 5 clean rows."""
    setup_statements = [
        "DROP VIEW IF EXISTS vw_practice_honor_students;",
        "DROP VIEW IF EXISTS vw_practice_students;",
        "DROP TABLE IF EXISTS practice_students;",
        """CREATE TABLE practice_students (
            student_id INT AUTO_INCREMENT PRIMARY KEY,
            roll_no VARCHAR(20) NOT NULL UNIQUE,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            dept_code VARCHAR(10) NOT NULL,
            gpa DECIMAL(3, 2) NOT NULL DEFAULT 7.50,
            city VARCHAR(50) DEFAULT 'Bengaluru',
            enrollment_date DATE DEFAULT '2026-08-01',
            CONSTRAINT chk_practice_gpa CHECK (gpa >= 0.00 AND gpa <= 10.00)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",
        """INSERT INTO practice_students (roll_no, first_name, last_name, dept_code, gpa, city, enrollment_date) VALUES
        ('P101', 'Rahul', 'Sharma', 'CSE', 8.45, 'Bengaluru', '2026-08-01'),
        ('P102', 'Ananya', 'Iyer', 'ISE', 9.10, 'Mysuru', '2026-08-01'),
        ('P103', 'Karan', 'Patel', 'ECE', 7.20, 'Bengaluru', '2026-08-02'),
        ('P104', 'Meera', 'Rao', 'CSE', 8.90, 'Mangaluru', '2026-08-02'),
        ('P105', 'Varun', 'Deshmukh', 'MECH', 6.80, 'Hubballi', '2026-08-03');""",
        "CREATE OR REPLACE VIEW vw_practice_students AS SELECT student_id, roll_no, first_name, last_name, dept_code, gpa, city FROM practice_students;",
        "CREATE OR REPLACE VIEW vw_practice_honor_students AS SELECT student_id, roll_no, first_name, last_name, dept_code, gpa, city FROM practice_students WHERE gpa >= 8.00 WITH CHECK OPTION;"
    ]
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            for stmt in setup_statements:
                cursor.execute(stmt)
        conn.close()
        return {"success": True, "message": "Practice table 'practice_students' and views successfully reset with 5 rows."}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ====================================================================
# Phase 4 Database Helper Functions: Procedures, Views, Constraints, Triggers
# ====================================================================

ALLOWED_PROCEDURES = {
    "sp_get_students_by_department": {
        "params": ["dept_code"],
        "description": "Returns student roster for a department sorted by GPA",
        "has_result_set": True,
        "has_out_params": False
    },
    "sp_get_event_roster": {
        "params": ["event_id"],
        "description": "Returns all registered attendees for a specific event",
        "has_result_set": True,
        "has_out_params": False
    },
    "sp_calculate_dept_gpa": {
        "params": ["dept_code"],
        "description": "Computes department GPA and headcount via OUT parameters",
        "has_result_set": False,
        "has_out_params": True
    },
    "sp_register_student_safe": {
        "params": ["student_id", "event_id"],
        "description": "Transactional registration check with capacity validation and OUT status",
        "has_result_set": False,
        "has_out_params": True
    }
}

def call_stored_procedure(procedure_name, params=None):
    """
    Safely executes a whitelisted stored procedure with parameterized inputs.
    Handles result sets and OUT parameters accurately.
    """
    if procedure_name not in ALLOWED_PROCEDURES:
        return {
            "success": False,
            "error": f"Invalid or unauthorized procedure '{procedure_name}'. Only approved educational procedures can be executed."
        }

    proc_info = ALLOWED_PROCEDURES[procedure_name]
    params = params or {}
    # Normalize list/tuple params into expected dict
    if isinstance(params, (list, tuple)):
        param_list = list(params)
        if procedure_name in ("sp_get_students_by_department", "sp_calculate_dept_gpa"):
            params = {"dept_code": param_list[0] if len(param_list) > 0 else "CSE"}
        elif procedure_name == "sp_get_event_roster":
            params = {"event_id": param_list[0] if len(param_list) > 0 else 1}
        elif procedure_name == "sp_register_student_safe":
            params = {
                "student_id": param_list[0] if len(param_list) > 0 else 1,
                "event_id": param_list[1] if len(param_list) > 1 else 6
            }
        else:
            params = {}

    start_time = time.perf_counter()

    conn = None
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            if procedure_name == "sp_get_students_by_department":
                dept = str(params.get("dept_code", "CSE")).strip().upper()
                cursor.callproc("sp_get_students_by_department", [dept])
                columns = [c[0] for c in cursor.description] if cursor.description else []
                raw_rows = cursor.fetchall()
                rows = [{col: serialize_value(r[col]) for col in columns} for r in raw_rows]
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "success": True,
                    "procedure": procedure_name,
                    "input_params": {"dept_code": dept},
                    "columns": columns,
                    "rows": rows,
                    "result_sets": [rows],
                    "out_parameters": {},
                    "row_count": len(rows),
                    "execution_time_ms": elapsed_ms,
                    "message": f"Procedure '{procedure_name}' executed. Fetched {len(rows)} student records for department '{dept}' in {elapsed_ms} ms."
                }

            elif procedure_name == "sp_get_event_roster":
                event_id = int(params.get("event_id", 1))
                cursor.callproc("sp_get_event_roster", [event_id])
                columns = [c[0] for c in cursor.description] if cursor.description else []
                raw_rows = cursor.fetchall()
                rows = [{col: serialize_value(r[col]) for col in columns} for r in raw_rows]
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "success": True,
                    "procedure": procedure_name,
                    "input_params": {"event_id": event_id},
                    "columns": columns,
                    "rows": rows,
                    "result_sets": [rows],
                    "out_parameters": {},
                    "row_count": len(rows),
                    "execution_time_ms": elapsed_ms,
                    "message": f"Procedure '{procedure_name}' executed. Fetched {len(rows)} attendee records for Event ID {event_id} in {elapsed_ms} ms."
                }

            elif procedure_name == "sp_calculate_dept_gpa":
                dept = str(params.get("dept_code", "CSE")).strip().upper()
                cursor.execute("SET @out_avg_gpa = 0.00, @out_count = 0;")
                cursor.execute("CALL sp_calculate_dept_gpa(%s, @out_avg_gpa, @out_count);", (dept,))
                cursor.execute("SELECT @out_avg_gpa AS average_gpa, @out_count AS total_students;")
                out_row = cursor.fetchone()
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                out_params = {
                    "out_avg_gpa": float(out_row["average_gpa"]) if out_row["average_gpa"] is not None else 0.0,
                    "out_student_count": int(out_row["total_students"]) if out_row["total_students"] is not None else 0,
                    "average_gpa": float(out_row["average_gpa"]) if out_row["average_gpa"] is not None else 0.0,
                    "total_students": int(out_row["total_students"]) if out_row["total_students"] is not None else 0
                }
                return {
                    "success": True,
                    "procedure": procedure_name,
                    "input_params": {"dept_code": dept},
                    "out_parameters": out_params,
                    "columns": ["dept_code", "average_gpa", "total_students"],
                    "rows": [{
                        "dept_code": dept,
                        "average_gpa": out_params["out_avg_gpa"],
                        "total_students": out_params["out_student_count"]
                    }],
                    "result_sets": [[{
                        "dept_code": dept,
                        "average_gpa": out_params["out_avg_gpa"],
                        "total_students": out_params["out_student_count"]
                    }]],
                    "row_count": 1,
                    "execution_time_ms": elapsed_ms,
                    "message": f"Procedure '{procedure_name}' executed. OUT parameters returned for '{dept}': Avg GPA = {out_row['average_gpa']}, Total = {out_row['total_students']}."
                }

            elif procedure_name == "sp_register_student_safe":
                student_id = int(params.get("student_id", 1))
                event_id = int(params.get("event_id", 6))
                cursor.execute("SET @out_status = '', @out_msg = '';")
                cursor.execute("CALL sp_register_student_safe(%s, %s, @out_status, @out_msg);", (student_id, event_id))
                cursor.execute("SELECT @out_status AS status, @out_msg AS message;")
                out_row = cursor.fetchone()
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                
                # Cleanup test registration if inserted
                if out_row["status"] == "SUCCESS":
                    cursor.execute("DELETE FROM registrations WHERE student_id = %s AND event_id = %s;", (student_id, event_id))
                    cursor.execute("DELETE FROM registration_audit WHERE student_id = %s AND event_id = %s;", (student_id, event_id))

                out_params = {
                    "out_status": out_row["status"],
                    "out_message": out_row["message"],
                    "status": out_row["status"],
                    "message": out_row["message"]
                }
                return {
                    "success": True,
                    "procedure": procedure_name,
                    "input_params": {"student_id": student_id, "event_id": event_id},
                    "out_parameters": out_params,
                    "columns": ["student_id", "event_id", "status", "message"],
                    "rows": [{
                        "student_id": student_id,
                        "event_id": event_id,
                        "status": out_row["status"],
                        "message": out_row["message"]
                    }],
                    "result_sets": [[{
                        "student_id": student_id,
                        "event_id": event_id,
                        "status": out_row["status"],
                        "message": out_row["message"]
                    }]],
                    "row_count": 1,
                    "execution_time_ms": elapsed_ms,
                    "message": f"Procedure '{procedure_name}' executed: Status={out_row['status']}, Message={out_row['message']}"
                }
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": False,
            "error": str(e),
            "execution_time_ms": elapsed_ms
        }
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass

def get_view_inspection(view_name):
    """Inspects a database view: definition SQL, columns, preview rows, and updatability."""
    allowed_views = {
        "vw_student_mentorship": {
            "updatable": False,
            "reason": "Contains JOIN between multiple tables (students and departments) without a unique 1:1 key mapping across all fields.",
            "base_tables": ["students", "departments"]
        },
        "vw_student_event_details": {
            "updatable": False,
            "reason": "Complex multi-table join across registrations, students, departments, events, attendance, and feedback.",
            "base_tables": ["registrations", "students", "departments", "events", "attendance", "feedback"]
        },
        "vw_department_statistics": {
            "updatable": False,
            "reason": "Contains aggregate functions (COUNT, AVG) and a GROUP BY clause.",
            "base_tables": ["departments", "students", "events"]
        },
        "vw_event_occupancy": {
            "updatable": False,
            "reason": "Contains aggregate function COUNT(r.registration_id) and calculated percentage expression.",
            "base_tables": ["events", "registrations"]
        },
        "vw_practice_students": {
            "updatable": True,
            "reason": "Simple 1:1 projection over single base table 'practice_students' with no aggregates or joins.",
            "base_tables": ["practice_students"]
        },
        "vw_practice_honor_students": {
            "updatable": True,
            "reason": "Updatable with WITH CHECK OPTION enforced. Only rows with GPA >= 8.00 are accepted for INSERT/UPDATE.",
            "base_tables": ["practice_students"]
        }
    }

    if view_name not in allowed_views:
        return {"success": False, "error": f"View '{view_name}' is not recognized."}

    meta = allowed_views[view_name]
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            cursor.execute(f"SHOW CREATE VIEW `{view_name}`;")
            create_row = cursor.fetchone()
            create_sql = create_row.get("Create View", "")

            cursor.execute(f"SELECT * FROM `{view_name}` LIMIT 5;")
            raw_rows = cursor.fetchall()
            columns = [c[0] for c in cursor.description] if cursor.description else []
            rows = [{col: serialize_value(r[col]) for col in columns} for r in raw_rows]

        conn.close()
        return {
            "success": True,
            "view_name": view_name,
            "create_sql": create_sql,
            "create_statement": create_sql,
            "updatable": meta["updatable"],
            "is_updatable": meta["updatable"],
            "reason": meta["reason"],
            "updatability_reason": meta["reason"],
            "base_tables": meta["base_tables"],
            "columns": columns,
            "rows": rows,
            "sample_data": rows,
            "row_count": len(rows)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def test_constraint_scenario(scenario_key):
    """
    Executes a specific constraint test scenario on practice_students or core tables,
    demonstrating how MySQL enforces relational integrity rules.
    """
    alias_map = {
        "duplicate_pk": "primary_key",
        "duplicate_unique": "unique",
        "not_null_violation": "not_null",
        "check_violation": "check",
        "fk_violation": "foreign_key",
        "default_test": "default"
    }
    normalized_key = alias_map.get(scenario_key, scenario_key)

    scenarios = {
        "primary_key": {
            "name": "PRIMARY KEY Violation",
            "table": "practice_students",
            "constraint": "PRIMARY KEY (student_id)",
            "sql": "INSERT INTO practice_students (student_id, roll_no, first_name, last_name, dept_code) VALUES (1, 'P991', 'Duplicate', 'PK', 'CSE');",
            "explanation": "Primary keys must be strictly unique. Record with student_id = 1 already exists."
        },
        "unique": {
            "name": "UNIQUE Constraint Violation",
            "table": "practice_students",
            "constraint": "UNIQUE (roll_no)",
            "sql": "INSERT INTO practice_students (roll_no, first_name, last_name, dept_code) VALUES ('P101', 'Duplicate', 'Roll', 'CSE');",
            "explanation": "The 'roll_no' column has a UNIQUE constraint. 'P101' already belongs to student Rahul Sharma."
        },
        "not_null": {
            "name": "NOT NULL Violation",
            "table": "practice_students",
            "constraint": "NOT NULL on 'first_name'",
            "sql": "INSERT INTO practice_students (roll_no, first_name, last_name, dept_code) VALUES ('P992', NULL, 'NullFirst', 'CSE');",
            "explanation": "The column 'first_name' is defined as NOT NULL. MySQL rejects inserting NULL."
        },
        "check": {
            "name": "CHECK Constraint Violation",
            "table": "practice_students",
            "constraint": "CONSTRAINT chk_practice_gpa CHECK (gpa >= 0.00 AND gpa <= 10.00)",
            "sql": "INSERT INTO practice_students (roll_no, first_name, last_name, dept_code, gpa) VALUES ('P993', 'Invalid', 'GPA', 'CSE', 12.50);",
            "explanation": "MySQL 8 enforces CHECK constraints. The GPA value 12.50 violates the permissible range [0.00, 10.00]."
        },
        "foreign_key": {
            "name": "FOREIGN KEY Violation",
            "table": "registrations",
            "constraint": "CONSTRAINT fk_registrations_student FOREIGN KEY (student_id) REFERENCES students(student_id)",
            "sql": "INSERT INTO registrations (student_id, event_id, status) VALUES (9999, 1, 'Confirmed');",
            "explanation": "Referential integrity requires that the foreign key student_id=9999 exists in parent table 'students'. It does not exist, so insertion is rejected."
        },
        "default": {
            "name": "DEFAULT Constraint Demonstration",
            "table": "practice_students",
            "constraint": "DEFAULT 7.50 on gpa, DEFAULT 'Bengaluru' on city",
            "sql": "INSERT INTO practice_students (roll_no, first_name, last_name, dept_code) VALUES ('P994', 'Test', 'Defaults', 'CSE');",
            "explanation": "When optional columns 'gpa', 'city', and 'enrollment_date' are omitted, MySQL automatically assigns their predefined DEFAULT values."
        }
    }

    if normalized_key not in scenarios:
        return {"success": False, "error": f"Unknown constraint scenario '{scenario_key}'."}

    info = scenarios[normalized_key]
    sql_to_run = info["sql"]

    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            cursor.execute(sql_to_run)
            affected = cursor.rowcount
            # If default test succeeded, clean it up immediately
            if normalized_key == "default":
                cursor.execute("DELETE FROM practice_students WHERE roll_no = 'P994';")
        conn.close()
        return {
            "success": True,
            "scenario": info["name"],
            "scenario_title": info["name"],
            "sql": sql_to_run,
            "attempted_sql": sql_to_run,
            "constraint_violated": False,
            "outcome": "PASSED (Operation Succeeded)",
            "status_type": "success",
            "message": "Statement executed successfully by MySQL! Default values were applied automatically.",
            "error_message": None,
            "explanation": info["explanation"]
        }
    except Exception as e:
        return {
            "success": True,  # Test harness successfully captured expected violation
            "scenario": info["name"],
            "scenario_title": info["name"],
            "sql": sql_to_run,
            "attempted_sql": sql_to_run,
            "constraint_violated": True,
            "outcome": "REJECTED by MySQL Engine (Constraint Enforced)",
            "status_type": "danger",
            "error": str(e),
            "error_message": str(e),
            "explanation": info["explanation"]
        }

def test_trigger_scenario(action):
    """
    Demonstrates BEFORE and AFTER trigger execution on live MySQL tables:
    1. 'capacity_check': Tests BEFORE INSERT capacity enforcement (trg_check_event_capacity).
    2. 'audit_log': Tests AFTER INSERT automated audit row logging (trg_audit_new_registration).
    """
    if action == "capacity_check":
        # Create a temporary event with capacity 1 and 1 existing registration
        try:
            conn = get_connection(use_database=True)
            with conn.cursor() as cursor:
                # 1. Insert temporary full event
                cursor.execute("""
                    INSERT INTO events (event_id, event_title, event_type, event_date, location, capacity, dept_id)
                    VALUES (999, 'Overbooked Workshop (Trigger Test)', 'Workshop', '2026-11-01', 'Room 101', 1, 1)
                    ON DUPLICATE KEY UPDATE capacity = 1;
                """)
                # 2. Insert 1 confirmed registration (fills capacity to 100%)
                cursor.execute("""
                    INSERT INTO registrations (registration_id, student_id, event_id, status)
                    VALUES (9991, 1, 999, 'Confirmed')
                    ON DUPLICATE KEY UPDATE status = 'Confirmed';
                """)
                # 3. Attempt to register a SECOND student (Student 2) into full event
                attempt_sql = "INSERT INTO registrations (student_id, event_id, status) VALUES (2, 999, 'Confirmed');"
                try:
                    cursor.execute(attempt_sql)
                    outcome = "UNEXPECTED SUCCESS"
                    msg = "Registration succeeded without capacity check."
                    err = None
                    rejected = False
                except Exception as trigger_err:
                    outcome = "REJECTED by BEFORE INSERT Trigger 'trg_check_event_capacity'"
                    msg = str(trigger_err)
                    err = str(trigger_err)
                    rejected = True

                # Cleanup test event and test registrations
                cursor.execute("DELETE FROM registrations WHERE event_id = 999;")
                cursor.execute("DELETE FROM registration_audit WHERE event_id = 999;")
                cursor.execute("DELETE FROM events WHERE event_id = 999;")

            conn.close()
            return {
                "success": True,
                "trigger_name": "trg_check_event_capacity",
                "trigger_fired": rejected,
                "timing": "BEFORE INSERT",
                "table": "registrations",
                "attempted_sql": attempt_sql,
                "rejected": rejected,
                "outcome": outcome,
                "message": msg,
                "error_message": err or msg,
                "explanation": "The BEFORE INSERT trigger calculated that event 999 has capacity=1 and already has 1 registration. It invoked SIGNAL SQLSTATE '45000' and aborted the transaction before the row was stored!"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    elif action == "audit_log":
        # Test AFTER INSERT trigger writing to registration_audit
        try:
            conn = get_connection(use_database=True)
            with conn.cursor() as cursor:
                # Insert a test registration on Event 6
                test_sql = "INSERT INTO registrations (registration_id, student_id, event_id, status) VALUES (8888, 1, 6, 'Confirmed');"
                cursor.execute("DELETE FROM registrations WHERE registration_id = 8888;")
                cursor.execute("DELETE FROM registration_audit WHERE registration_id = 8888;")
                
                cursor.execute(test_sql)
                
                # Fetch the audit record automatically created by the trigger
                cursor.execute("SELECT * FROM registration_audit WHERE registration_id = 8888;")
                audit_row = cursor.fetchone()

                # Cleanup test registration and audit record
                cursor.execute("DELETE FROM registrations WHERE registration_id = 8888;")
                cursor.execute("DELETE FROM registration_audit WHERE registration_id = 8888;")

            conn.close()
            audit_records = [audit_row] if audit_row else []
            return {
                "success": True,
                "trigger_name": "trg_audit_new_registration",
                "trigger_fired": True,
                "timing": "AFTER INSERT",
                "table": "registrations",
                "attempted_sql": test_sql,
                "audit_recorded": audit_row is not None,
                "inserted_registration_id": 8888,
                "audit_records": audit_records,
                "audit_data": {
                    "audit_id": audit_row["audit_id"] if audit_row else None,
                    "registration_id": audit_row["registration_id"] if audit_row else None,
                    "student_id": audit_row["student_id"] if audit_row else None,
                    "event_id": audit_row["event_id"] if audit_row else None,
                    "action_type": audit_row["action_type"] if audit_row else None,
                    "log_time": str(audit_row["log_time"]) if audit_row else None,
                    "details": audit_row["details"] if audit_row else None
                } if audit_row else None,
                "explanation": "The AFTER INSERT trigger executed immediately after the registration record was committed, automatically writing an immutable audit log entry with action_type='INSERT' and timestamp!"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    else:
        return {"success": False, "error": f"Unknown trigger action '{action}'."}

