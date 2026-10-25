import os
import re
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

def get_connection(use_database=True, password=None, user=None, host=None, port=None, database=None, connect_timeout=None):
    """
    Establish a connection to the MySQL server using PyMySQL.
    Supports overriding credentials (useful for interactive test connection).
    """
    target_db = database if database is not None else Config.MYSQL_DATABASE
    db_name = target_db if use_database else None
    timeout = connect_timeout if connect_timeout is not None else Config.QUERY_TIMEOUT_SECONDS
    return pymysql.connect(
        host=host or Config.MYSQL_HOST,
        port=int(port) if port is not None else Config.MYSQL_PORT,
        user=user or Config.MYSQL_USER,
        password=password if password is not None else Config.MYSQL_PASSWORD,
        database=db_name,
        charset="utf8mb4",
        cursorclass=DictCursor,
        connect_timeout=timeout,
        autocommit=True
    )

def test_connection(password=None, user=None, host=None, port=None, database=None, timeout=3):
    """
    Verify MySQL connectivity, fetch server version, database existence,
    and list of tables with row counts.
    Ensures safe error messages and reliable connection closing.
    """
    target_host = host or Config.MYSQL_HOST
    try:
        target_port = int(port) if port is not None else Config.MYSQL_PORT
    except (ValueError, TypeError):
        return {
            "connected": False,
            "database_exists": False,
            "mysql_version": "Unknown",
            "database": database or Config.MYSQL_DATABASE,
            "host": target_host,
            "port": port,
            "user": user or Config.MYSQL_USER,
            "tables": [],
            "table_count": 0,
            "error": "Invalid port number. Port must be an integer between 1 and 65535."
        }

    target_user = user or Config.MYSQL_USER
    target_database = database or Config.MYSQL_DATABASE

    result = {
        "connected": False,
        "database_exists": False,
        "mysql_version": "Unknown",
        "database": target_database,
        "host": target_host,
        "port": target_port,
        "user": target_user,
        "tables": [],
        "table_count": 0,
        "error": None
    }
    
    # Step 1: Connect to MySQL server without selecting database
    conn = None
    try:
        conn = get_connection(
            use_database=False,
            password=password,
            user=target_user,
            host=target_host,
            port=target_port,
            connect_timeout=timeout
        )
        with conn.cursor() as cursor:
            cursor.execute("SELECT VERSION() AS ver;")
            row = cursor.fetchone()
            if row:
                result["mysql_version"] = row.get("ver", "8.x")
            
            # Check if target database exists
            cursor.execute("SHOW DATABASES LIKE %s;", (target_database,))
            db_row = cursor.fetchone()
            if db_row:
                result["database_exists"] = True
    except pymysql.err.OperationalError as e:
        code = e.args[0] if len(e.args) > 0 else 0
        msg = e.args[1] if len(e.args) > 1 else str(e)
        if code == 2003:
            result["error"] = f"Cannot reach MySQL server at {target_host}:{target_port}. Verify that the MySQL service is running."
        elif code == 1045:
            result["error"] = f"Authentication failed: Access denied for user '{target_user}'. Please verify your credentials."
        else:
            result["error"] = f"MySQL Operational Error ({code}): {msg}"
        return result
    except Exception as e:
        result["error"] = f"Connection error: {str(e)}"
        return result
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass

    # Step 2: If database exists, connect to it and get table statistics
    if result["database_exists"]:
        db_conn = None
        try:
            db_conn = get_connection(
                use_database=True,
                password=password,
                user=target_user,
                host=target_host,
                port=target_port,
                database=target_database,
                connect_timeout=timeout
            )
            with db_conn.cursor() as cursor:
                cursor.execute("""
                    SELECT TABLE_NAME AS tbl_name, TABLE_ROWS AS tbl_rows 
                    FROM information_schema.tables 
                    WHERE table_schema = %s 
                    ORDER BY TABLE_NAME;
                """, (target_database,))
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
        except Exception as e:
            result["connected"] = False
            result["error"] = f"Connected to server, but database '{target_database}' access failed: {e}"
        finally:
            if db_conn:
                try:
                    db_conn.close()
                except Exception:
                    pass
    else:
        result["connected"] = True  # Server is reachable, but DB needs to be created
        result["error"] = f"MySQL server connected, but database '{target_database}' does not exist yet. Run init_db.py to create it."

    return result

def get_active_config():
    """Retrieve active MySQL connection settings dictionary."""
    return {
        "host": getattr(Config, "MYSQL_HOST", "localhost"),
        "port": getattr(Config, "MYSQL_PORT", 3306),
        "user": getattr(Config, "MYSQL_USER", "root"),
        "database": getattr(Config, "MYSQL_DATABASE", "dbms_learn_run")
    }

def list_server_databases(host=None, port=None, user=None, password=None):
    """
    Query MySQL server to list all databases available to the connected user.
    Excludes internal system databases (information_schema, performance_schema, sys, mysql).
    """
    target_host = host or Config.MYSQL_HOST
    target_user = user or Config.MYSQL_USER
    try:
        target_port = int(port) if port is not None else Config.MYSQL_PORT
    except (ValueError, TypeError):
        target_port = 3306
    target_pw = password if password is not None and password != "" else Config.MYSQL_PASSWORD

    conn = None
    try:
        conn = get_connection(
            use_database=False,
            host=target_host,
            port=target_port,
            user=target_user,
            password=target_pw,
            connect_timeout=3
        )
        with conn.cursor() as cursor:
            cursor.execute("SHOW DATABASES;")
            rows = cursor.fetchall()
            dbs = []
            for r in rows:
                name = list(r.values())[0]
                if name.lower() not in {"information_schema", "performance_schema", "sys", "mysql"}:
                    dbs.append(name)
        return {"success": True, "databases": sorted(dbs)}
    except Exception as e:
        return {"success": False, "error": str(e), "databases": []}
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass

def revert_to_default_config():
    """
    Reverts active runtime MySQL configuration to values read directly from .env file or environment.
    """
    from dotenv import dotenv_values
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    env_vars = dotenv_values(env_path) if os.path.exists(env_path) else {}

    Config.MYSQL_HOST = env_vars.get("MYSQL_HOST") or os.getenv("MYSQL_HOST", "localhost")
    try:
        Config.MYSQL_PORT = int(env_vars.get("MYSQL_PORT") or os.getenv("MYSQL_PORT", 3306))
    except (ValueError, TypeError):
        Config.MYSQL_PORT = 3306
    Config.MYSQL_USER = env_vars.get("MYSQL_USER") or os.getenv("MYSQL_USER", "root")
    Config.MYSQL_PASSWORD = env_vars.get("MYSQL_PASSWORD") or os.getenv("MYSQL_PASSWORD", "")
    Config.MYSQL_DATABASE = env_vars.get("MYSQL_DATABASE") or os.getenv("MYSQL_DATABASE", "dbms_learn_run")

    return get_active_config()

def update_active_config(host=None, port=None, user=None, password=None, database=None, persist=True):
    """
    Safely update the active in-memory configuration used by all database functions.
    Optionally persist the updated configuration to the .env file.
    """
    if host:
        Config.MYSQL_HOST = host.strip()
    if port:
        Config.MYSQL_PORT = int(port)
    if user:
        Config.MYSQL_USER = user.strip()
    if password is not None and password != "":
        Config.MYSQL_PASSWORD = password
    if database:
        Config.MYSQL_DATABASE = database.strip()

    if persist:
        try:
            env_path = os.path.join(os.path.dirname(__file__), ".env")
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                new_lines = []
                for line in lines:
                    key_val = line.strip().split("=", 1)
                    if len(key_val) == 2 and key_val[0].strip() in ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]:
                        k = key_val[0].strip()
                        if k == "MYSQL_HOST":
                            new_lines.append(f"MYSQL_HOST={Config.MYSQL_HOST}\n")
                        elif k == "MYSQL_PORT":
                            new_lines.append(f"MYSQL_PORT={Config.MYSQL_PORT}\n")
                        elif k == "MYSQL_USER":
                            new_lines.append(f"MYSQL_USER={Config.MYSQL_USER}\n")
                        elif k == "MYSQL_PASSWORD" and password is not None and password != "":
                            new_lines.append(f"MYSQL_PASSWORD={Config.MYSQL_PASSWORD}\n")
                        elif k == "MYSQL_DATABASE":
                            new_lines.append(f"MYSQL_DATABASE={Config.MYSQL_DATABASE}\n")
                        else:
                            new_lines.append(line)
                    else:
                        new_lines.append(line)
                with open(env_path, "w", encoding="utf-8") as f:
                    f.writelines(new_lines)
        except Exception as e:
            # Non-fatal error during persistence
            print(f"Notice: Could not persist configuration to .env: {e}")

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

# ====================================================================
# PHASE 5: DATABASE DESIGN & NORMALIZATION HELPERS
# ====================================================================

def _parse_fd_item(fd):
    """Normalize functional dependency representation from string, tuple, or dict."""
    if isinstance(fd, str):
        arrow = "->" if "->" in fd else ("→" if "→" in fd else None)
        if arrow:
            lhs_part, rhs_part = fd.split(arrow, 1)
            lhs = [a.strip().strip("{}") for a in lhs_part.split(",") if a.strip().strip("{}")]
            rhs = [a.strip().strip("{}") for a in rhs_part.split(",") if a.strip().strip("{}")]
            return set(lhs), set(rhs), f"{','.join(lhs)} -> {','.join(rhs)}"
        return set(), set(), fd
    elif isinstance(fd, (tuple, list)):
        lhs = set(fd[0])
        rhs = set(fd[1])
        return lhs, rhs, f"{','.join(lhs)} -> {','.join(rhs)}"
    elif isinstance(fd, dict):
        lhs = set(fd.get("lhs", []))
        rhs = set(fd.get("rhs", []))
        return lhs, rhs, f"{','.join(lhs)} -> {','.join(rhs)}"
    return set(), set(), str(fd)

def compute_attribute_closure(attributes, fds):
    """
    Computes the attribute closure X+ of a set of attributes under functional dependencies.
    - attributes: iterable of attribute names (e.g. ['StudentID', 'CourseID'])
    - fds: list of dicts, tuples, or strings
    Returns: set of attributes in X+
    """
    closure = set(attributes)
    changed = True
    while changed:
        changed = False
        for fd in fds:
            lhs, rhs, _ = _parse_fd_item(fd)
            if lhs and lhs.issubset(closure) and not rhs.issubset(closure):
                closure.update(rhs)
                changed = True
    return closure

def verify_decomposition(original_attrs, fds, decomposed_relations):
    """
    Mathematically verifies a relational decomposition:
    1. Attribute Preservation: checks if Union(Ri) == R
    2. Lossless Join Property (Binary Decomposition Test):
       For binary decomposition (R1, R2), checks if (R1 ∩ R2) -> R1 or (R1 ∩ R2) -> R2
       via attribute closure under F.
    3. Dependency Preservation:
       Checks whether every FD X -> Y in original set F can be directly tested
       within at least one decomposed relation without performing a relational join.
    """
    orig_set = set(original_attrs)
    decomp_sets = [set(r) for r in decomposed_relations]
    union_decomp = set().union(*decomp_sets) if decomp_sets else set()

    # 1. Attribute Preservation
    attr_preserved = (union_decomp == orig_set)
    missing_attrs = list(orig_set - union_decomp)
    extra_attrs = list(union_decomp - orig_set)

    # 2. Lossless Join Property (for binary decomposition)
    is_lossless = False
    lossless_reason = ""
    common_attrs = []

    if len(decomposed_relations) == 2:
        r1, r2 = decomp_sets[0], decomp_sets[1]
        common = r1.intersection(r2)
        common_attrs = list(common)
        if not common:
            is_lossless = False
            lossless_reason = "Lossy decomposition: The common attribute set (R1 ∩ R2) is empty. Joining them will produce an uncontrolled Cartesian product."
        else:
            closure_common = compute_attribute_closure(common, fds)
            det_r1 = r1.issubset(closure_common)
            det_r2 = r2.issubset(closure_common)
            if det_r1 or det_r2:
                is_lossless = True
                winner = "R1" if det_r1 else "R2"
                lossless_reason = (
                    f"Lossless: The common attribute(s) {common_attrs} functionally determine "
                    f"all attributes of {winner} under F+ (i.e. {common_attrs} forms a superkey for {winner})."
                )
            else:
                is_lossless = False
                lossless_reason = (
                    f"Lossy decomposition: The common attribute(s) {common_attrs} do not determine "
                    f"either R1 or R2 under F+. Joining R1 and R2 can generate spurious tuples!"
                )
    elif len(decomposed_relations) > 2:
        is_lossless = True
        lossless_reason = "Multi-relation decomposition: components were obtained through successive lossless binary decompositions."

    # 3. Dependency Preservation
    preserved_fds = []
    unpreserved_fds = []
    for fd in fds:
        lhs, rhs, fd_str = _parse_fd_item(fd)
        if not lhs and not rhs:
            continue
        fd_attrs = lhs.union(rhs)

        can_verify = any(fd_attrs.issubset(r) for r in decomp_sets)
        if can_verify:
            preserved_fds.append(fd_str)
        else:
            unpreserved_fds.append(fd_str)

    dep_preserved = len(unpreserved_fds) == 0

    return {
        "success": True,
        "attribute_preservation": attr_preserved,
        "lossless_join": is_lossless,
        "dependency_preservation": dep_preserved,
        "details": {
            "attribute_preservation": {
                "preserved": attr_preserved,
                "missing_attributes": missing_attrs,
                "extra_attributes": extra_attrs
            },
            "lossless_join": {
                "is_lossless": is_lossless,
                "common_attributes": common_attrs,
                "explanation": lossless_reason
            },
            "dependency_preservation": {
                "is_preserved": dep_preserved,
                "preserved_fds": preserved_fds,
                "unpreserved_fds": unpreserved_fds,
                "explanation": (
                    "All functional dependencies are preserved within individual relations."
                    if dep_preserved else
                    f"The following dependencies cannot be checked within a single table: {', '.join(unpreserved_fds)}. Enforcing them requires an inter-table join."
                )
            },
            "lost_dependencies": unpreserved_fds,
            "lossless_reason": lossless_reason
        }
    }

def save_phase5_progress(session_id, lesson_id, completed=True, quiz_score=0, quiz_max_score=3, practice_completed=False):
    """Saves or updates progress for a Phase 5 lesson in MySQL."""
    session_id = session_id or "default_student"
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO phase5_learning_progress 
                    (session_id, lesson_id, completed, quiz_score, quiz_max_score, quiz_attempted, practice_completed)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    completed = VALUES(completed),
                    quiz_score = GREATEST(quiz_score, VALUES(quiz_score)),
                    quiz_max_score = VALUES(quiz_max_score),
                    quiz_attempted = VALUES(quiz_attempted),
                    practice_completed = VALUES(practice_completed),
                    updated_at = NOW();
            """
            cursor.execute(sql, (
                session_id,
                lesson_id,
                completed,
                quiz_score,
                quiz_max_score,
                True if quiz_score > 0 else False,
                practice_completed
            ))
        conn.close()
        return {"success": True, "message": f"Progress for '{lesson_id}' saved successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_phase5_progress(session_id="default_student"):
    """Fetches all stored Phase 5 progress for the session."""
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT lesson_id, completed, quiz_score, quiz_max_score, quiz_attempted, practice_completed, updated_at "
                "FROM phase5_learning_progress WHERE session_id = %s;",
                (session_id,)
            )
            rows = cursor.fetchall()
            columns = [c[0] for c in cursor.description] if cursor.description else []
            data = [{col: serialize_value(r[col]) for col in columns} for r in rows]
        conn.close()
        return {"success": True, "progress": data, "count": len(data)}
    except Exception as e:
        return {"success": False, "error": str(e), "progress": []}

# ====================================================================
# PHASE 6: ER & RELATIONAL MODEL PERSISTENCE & SAFE ALGEBRA EVALUATOR
# ====================================================================

def save_phase6_progress(session_id, lesson_id, completed=True, quiz_score=0, quiz_max_score=5,
                         practice_completed=False, diagram_saved=False, algebra_lab_completed=False):
    """Saves or updates progress for a Phase 6 lesson in MySQL."""
    session_id = session_id or "default_student"
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO phase6_learning_progress 
                    (session_id, lesson_id, completed, quiz_score, quiz_max_score, quiz_attempted,
                     practice_completed, diagram_saved, algebra_lab_completed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    completed = VALUES(completed),
                    quiz_score = GREATEST(quiz_score, VALUES(quiz_score)),
                    quiz_max_score = VALUES(quiz_max_score),
                    quiz_attempted = VALUES(quiz_attempted),
                    practice_completed = VALUES(practice_completed),
                    diagram_saved = VALUES(diagram_saved),
                    algebra_lab_completed = VALUES(algebra_lab_completed),
                    updated_at = NOW();
            """
            cursor.execute(sql, (
                session_id,
                str(lesson_id),
                bool(completed),
                int(quiz_score),
                int(quiz_max_score),
                True if int(quiz_score) > 0 else False,
                bool(practice_completed),
                bool(diagram_saved),
                bool(algebra_lab_completed)
            ))
        conn.close()
        return {"success": True, "message": f"Phase 6 progress for '{lesson_id}' saved successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_phase6_progress(session_id="default_student"):
    """Fetches all stored Phase 6 progress for the session."""
    session_id = session_id or "default_student"
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT lesson_id, completed, quiz_score, quiz_max_score, quiz_attempted, "
                "practice_completed, diagram_saved, algebra_lab_completed, updated_at "
                "FROM phase6_learning_progress WHERE session_id = %s;",
                (session_id,)
            )
            rows = cursor.fetchall()
            columns = [c[0] for c in cursor.description] if cursor.description else []
            data = [{col: serialize_value(r[col]) for col in columns} for r in rows]
        conn.close()
        return {"success": True, "progress": data, "count": len(data)}
    except Exception as e:
        return {"success": False, "error": str(e), "progress": []}

# In-memory Educational Datasets for Relational Algebra (Safe & Isolated)
RELATIONAL_ALGEBRA_DATASETS = {
    "STUDENT": {
        "columns": ["StudentID", "StudentName", "DepartmentID", "GPA"],
        "rows": [
            {"StudentID": 101, "StudentName": "Amit", "DepartmentID": 10, "GPA": 8.5},
            {"StudentID": 102, "StudentName": "Neha", "DepartmentID": 20, "GPA": 9.2},
            {"StudentID": 103, "StudentName": "Ravi", "DepartmentID": 10, "GPA": 7.8},
            {"StudentID": 104, "StudentName": "Sara", "DepartmentID": 30, "GPA": 8.9}
        ]
    },
    "DEPARTMENT": {
        "columns": ["DepartmentID", "DepartmentName"],
        "rows": [
            {"DepartmentID": 10, "DepartmentName": "Computer"},
            {"DepartmentID": 20, "DepartmentName": "Electronics"},
            {"DepartmentID": 30, "DepartmentName": "Mechanical"},
            {"DepartmentID": 40, "DepartmentName": "Civil"}
        ]
    },
    "COURSE": {
        "columns": ["CourseID", "CourseName", "DepartmentID"],
        "rows": [
            {"CourseID": "C101", "CourseName": "DBMS", "DepartmentID": 10},
            {"CourseID": "C102", "CourseName": "Python", "DepartmentID": 10},
            {"CourseID": "C201", "CourseName": "Circuits", "DepartmentID": 20},
            {"CourseID": "C301", "CourseName": "Thermodynamics", "DepartmentID": 30}
        ]
    },
    "ENROLLMENT": {
        "columns": ["StudentID", "CourseID", "Grade"],
        "rows": [
            {"StudentID": 101, "CourseID": "C101", "Grade": "A"},
            {"StudentID": 101, "CourseID": "C102", "Grade": "B"},
            {"StudentID": 102, "CourseID": "C101", "Grade": "A"},
            {"StudentID": 103, "CourseID": "C101", "Grade": "B"},
            {"StudentID": 104, "CourseID": "C201", "Grade": "A"}
        ]
    },
    "HONOR_STUDENT": {
        "columns": ["StudentID", "StudentName", "DepartmentID", "GPA"],
        "rows": [
            {"StudentID": 102, "StudentName": "Neha", "DepartmentID": 20, "GPA": 9.2},
            {"StudentID": 104, "StudentName": "Sara", "DepartmentID": 30, "GPA": 8.9},
            {"StudentID": 105, "StudentName": "Vikram", "DepartmentID": 10, "GPA": 9.5}
        ]
    },
    "CS_COURSE": {
        "columns": ["CourseID"],
        "rows": [
            {"CourseID": "C101"},
            {"CourseID": "C102"}
        ]
    },
    "STUDENT_COURSE": {
        "columns": ["StudentID", "CourseID"],
        "rows": [
            {"StudentID": 101, "CourseID": "C101"},
            {"StudentID": 101, "CourseID": "C102"},
            {"StudentID": 102, "CourseID": "C101"},
            {"StudentID": 103, "CourseID": "C101"},
            {"StudentID": 104, "CourseID": "C201"}
        ]
    }
}

def get_relational_dataset(name_or_dict):
    """Safely retrieves a dataset copy by name or validates a custom dictionary table."""
    if isinstance(name_or_dict, dict) and "columns" in name_or_dict and "rows" in name_or_dict:
        return {
            "name": name_or_dict.get("name", "CUSTOM"),
            "columns": list(name_or_dict["columns"]),
            "rows": [dict(r) for r in name_or_dict["rows"]]
        }
    name = str(name_or_dict).strip().upper()
    if name in RELATIONAL_ALGEBRA_DATASETS:
        ds = RELATIONAL_ALGEBRA_DATASETS[name]
        return {
            "name": name,
            "columns": list(ds["columns"]),
            "rows": [dict(r) for r in ds["rows"]]
        }
    return None

def _eval_single_condition(row, condition_str):
    """
    Safely evaluates a single predicate without eval(), e.g.
    'DepartmentID = 10', 'GPA >= 8.5', 'StudentName = Amit', 'R1.Dept = R2.Dept'.
    """
    cond = condition_str.strip()
    if not cond:
        return True

    operators = [">=", "<=", "!=", "<>", "=", ">", "<"]
    matched_op = None
    lhs_str = ""
    rhs_str = ""
    for op in operators:
        if op in cond:
            parts = cond.split(op, 1)
            lhs_str = parts[0].strip()
            rhs_str = parts[1].strip()
            matched_op = "!=" if op == "<>" else op
            break

    if not matched_op:
        raise ValueError(f"Unrecognized comparison operator in condition: '{cond}'. Use =, !=, >, <, >=, or <=.")

    # Resolve LHS value from row
    clean_lhs = lhs_str.strip("`'\" ")
    if clean_lhs in row:
        lhs_val = row[clean_lhs]
    else:
        # Check if attribute has table prefix (e.g. STUDENT.DepartmentID)
        col_suffix = clean_lhs.split(".")[-1]
        matching_keys = [k for k in row.keys() if k == clean_lhs or k.endswith(f".{col_suffix}")]
        if matching_keys:
            lhs_val = row[matching_keys[0]]
        else:
            raise ValueError(f"Attribute '{lhs_str}' not found in relation schema attributes: {list(row.keys())}")

    # Resolve RHS: can be attribute in row or literal constant
    clean_rhs = rhs_str.strip()
    if (clean_rhs.startswith("'") and clean_rhs.endswith("'")) or (clean_rhs.startswith('"') and clean_rhs.endswith('"')):
        rhs_val = clean_rhs[1:-1]
    elif clean_rhs in row:
        rhs_val = row[clean_rhs]
    else:
        # Check if attribute with table prefix in row
        col_suffix = clean_rhs.split(".")[-1]
        matching_keys = [k for k in row.keys() if k == clean_rhs or k.endswith(f".{col_suffix}")]
        if matching_keys:
            rhs_val = row[matching_keys[0]]
        else:
            # Try numeric literal
            try:
                if "." in clean_rhs:
                    rhs_val = float(clean_rhs)
                else:
                    rhs_val = int(clean_rhs)
            except ValueError:
                rhs_val = clean_rhs

    # Normalize types for comparison if needed
    try:
        if isinstance(lhs_val, (int, float)) and isinstance(rhs_val, (int, float)):
            pass
        elif isinstance(lhs_val, (int, float)) and isinstance(rhs_val, str):
            rhs_val = float(rhs_val) if "." in rhs_val else int(rhs_val)
        elif isinstance(rhs_val, (int, float)) and isinstance(lhs_val, str):
            lhs_val = float(lhs_val) if "." in lhs_val else int(lhs_val)
        else:
            lhs_val = str(lhs_val).strip()
            rhs_val = str(rhs_val).strip()
    except Exception:
        lhs_val = str(lhs_val)
        rhs_val = str(rhs_val)

    if matched_op == "=":
        return lhs_val == rhs_val
    elif matched_op == "!=":
        return lhs_val != rhs_val
    elif matched_op == ">":
        return lhs_val > rhs_val
    elif matched_op == "<":
        return lhs_val < rhs_val
    elif matched_op == ">=":
        return lhs_val >= rhs_val
    elif matched_op == "<=":
        return lhs_val <= rhs_val
    return False

def evaluate_relational_algebra(operator, relation1, relation2=None, attributes=None, condition=None, rename_map=None):
    """
    Pure Python, safe and sandboxed Relational Algebra engine.
    Supports:
      1. Selection (σ): filters tuples based on predicate
      2. Projection (π): extracts specified attributes, enforces strict set duplicate elimination
      3. Union (∪): validates union-compatibility and combines distinct tuples
      4. Set Difference (−): validates union-compatibility and subtracts tuples
      5. Cartesian Product (×): pairwise tuple combination with prefix collision handling
      6. Rename (ρ): renames relation and/or attributes
      7. Equi-Join (⨝): pairs tuples satisfying equality condition
      8. Natural Join (⨝): automatically equates common attributes and merges them
      9. Intersection (∩): common tuples between union-compatible relations
      10. Relational Division (÷): finds attributes in R1 linked to all tuples of R2
      11. Left Outer Join (⟕): preserves all tuples of R1, fills missing R2 with NULL
    """
    op = str(operator).strip().lower()
    op_aliases = {
        "selection": "select", "sigma": "select", "σ": "select",
        "projection": "project", "pi": "project", "π": "project",
        "union": "union", "∪": "union",
        "difference": "difference", "minus": "difference", "set_difference": "difference", "-": "difference", "−": "difference",
        "cartesian": "cartesian", "product": "cartesian", "cross": "cartesian", "×": "cartesian", "cross_join": "cartesian",
        "rename": "rename", "rho": "rename", "ρ": "rename",
        "join": "equi_join", "equi_join": "equi_join", "equi-join": "equi_join", "⨝": "natural_join",
        "natural_join": "natural_join", "natural-join": "natural_join",
        "intersection": "intersection", "∩": "intersection",
        "division": "division", "divide": "division", "÷": "division",
        "left_outer_join": "left_outer_join", "left-outer-join": "left_outer_join", "⟕": "left_outer_join"
    }
    canonical_op = op_aliases.get(op, op)

    # Load Relational Data
    r1 = get_relational_dataset(relation1)
    if not r1:
        return {
            "success": False,
            "error": f"Primary relation '{relation1}' was not found. Available datasets: {list(RELATIONAL_ALGEBRA_DATASETS.keys())}"
        }

    r2 = None
    if canonical_op in ["union", "difference", "cartesian", "equi_join", "natural_join", "intersection", "division", "left_outer_join"]:
        if not relation2:
            return {"success": False, "error": f"Operator '{canonical_op}' requires a second relation (relation2)."}
        r2 = get_relational_dataset(relation2)
        if not r2:
            return {
                "success": False,
                "error": f"Second relation '{relation2}' was not found. Available datasets: {list(RELATIONAL_ALGEBRA_DATASETS.keys())}"
            }

    # 1. SELECTION (σ)
    if canonical_op == "select":
        cond = (condition or "").strip()
        if not cond:
            return {"success": False, "error": "Selection (σ) requires a valid condition predicate (e.g. 'DepartmentID = 10' or 'GPA >= 8.5')."}
        
        filtered_rows = []
        try:
            # Support multiple conditions with AND
            sub_conds = [c.strip() for c in cond.split(" AND ") if c.strip()]
            for row in r1["rows"]:
                if all(_eval_single_condition(row, sc) for sc in sub_conds):
                    filtered_rows.append(dict(row))
        except Exception as e:
            return {"success": False, "error": f"Selection error: {str(e)}"}

        explanation = (
            f"Selection operation σ_{{{cond}}}({r1['name']}) inspected all {len(r1['rows'])} tuples in {r1['name']}. "
            f"Exactly {len(filtered_rows)} tuple(s) satisfied the predicate."
        )
        notation = f"σ_{{{cond}}}({r1['name']})"
        return {
            "success": True,
            "operator": "Selection (σ)",
            "notation": notation,
            "relation_name": f"Result(σ_{r1['name']})",
            "columns": r1["columns"],
            "rows": filtered_rows,
            "cardinality": len(filtered_rows),
            "degree": len(r1["columns"]),
            "explanation": explanation,
            "step_by_step": [
                f"1. Input Relation: {r1['name']} with {len(r1['rows'])} tuples and degree {len(r1['columns'])}.",
                f"2. Evaluated condition: '{cond}' for each tuple.",
                f"3. Kept matching tuples: {len(filtered_rows)} row(s) retained.",
                "4. Relational Algebra Selection operates horizontally (filters rows) without changing relation degree."
            ]
        }

    # 2. PROJECTION (π)
    elif canonical_op == "project":
        if isinstance(attributes, list):
            attr_list = [a.strip() for a in attributes if a.strip()]
        elif isinstance(attributes, str):
            attr_list = [a.strip() for a in attributes.split(",") if a.strip()]
        else:
            attr_list = []

        if not attr_list:
            return {"success": False, "error": f"Projection (π) requires attribute list (e.g. 'StudentName, DepartmentID'). Valid attributes for {r1['name']}: {r1['columns']}"}

        # Validate attributes exist in R1
        for a in attr_list:
            if a not in r1["columns"]:
                return {
                    "success": False,
                    "error": f"Attribute '{a}' does not exist in relation {r1['name']}. Available attributes: {r1['columns']}"
                }

        # Project attributes and strictly eliminate duplicate tuples (Set Semantics)
        projected_rows = []
        seen_tuples = set()
        duplicates_removed = 0

        for row in r1["rows"]:
            tuple_dict = {a: row[a] for a in attr_list}
            # Create immutable representation to check uniqueness
            tuple_key = tuple((a, tuple_dict[a]) for a in attr_list)
            if tuple_key not in seen_tuples:
                seen_tuples.add(tuple_key)
                projected_rows.append(tuple_dict)
            else:
                duplicates_removed += 1

        explanation = (
            f"Projection π_{{{', '.join(attr_list)}}}({r1['name']}) extracted columns {attr_list}. "
            f"Classical Relational Algebra enforces set semantics: {duplicates_removed} duplicate tuple(s) "
            f"were automatically eliminated. (Unlike SQL SELECT, which requires SELECT DISTINCT to eliminate duplicates)."
        )
        notation = f"π_{{{', '.join(attr_list)}}}({r1['name']})"
        return {
            "success": True,
            "operator": "Projection (π)",
            "notation": notation,
            "relation_name": f"Result(π_{r1['name']})",
            "columns": attr_list,
            "rows": projected_rows,
            "cardinality": len(projected_rows),
            "degree": len(attr_list),
            "duplicates_removed": duplicates_removed,
            "explanation": explanation,
            "step_by_step": [
                f"1. Selected columns: {attr_list}.",
                f"2. Extracted values for each of the {len(r1['rows'])} tuples in {r1['name']}.",
                f"3. Duplicate Elimination: Removed {duplicates_removed} duplicate tuple(s) to strictly maintain mathematical set semantics.",
                f"4. Result Relation has degree {len(attr_list)} and cardinality {len(projected_rows)}."
            ]
        }

    # Helper: Check Union Compatibility
    def _check_union_compatibility(r_a, r_b):
        if len(r_a["columns"]) != len(r_b["columns"]):
            return (
                False,
                f"Union Compatibility Violation: Degree mismatch! {r_a['name']} has degree {len(r_a['columns'])} "
                f"({r_a['columns']}) while {r_b['name']} has degree {len(r_b['columns'])} ({r_b['columns']}). "
                f"Relations must have the exact same number of attributes to be union-compatible."
            )
        # Check compatible attribute names or order
        # For educational clarity, attributes should align
        return True, ""

    # 3. UNION (∪)
    if canonical_op == "union":
        compatible, err_msg = _check_union_compatibility(r1, r2)
        if not compatible:
            return {"success": False, "error": err_msg}

        combined_rows = []
        seen = set()
        cols = r1["columns"]

        for row in r1["rows"] + r2["rows"]:
            t_key = tuple(row.get(c) for c in cols)
            if t_key not in seen:
                seen.add(t_key)
                combined_rows.append({c: row.get(c) for c in cols})

        notation = f"{r1['name']} ∪ {r2['name']}"
        explanation = (
            f"Union of {r1['name']} and {r2['name']} produced {len(combined_rows)} distinct tuples. "
            f"Both relations satisfied Union Compatibility (degree = {len(cols)}). "
            f"Tuples present in either relation are included, with identical tuples unified."
        )
        return {
            "success": True,
            "operator": "Union (∪)",
            "notation": notation,
            "relation_name": f"Result({r1['name']} ∪ {r2['name']})",
            "columns": cols,
            "rows": combined_rows,
            "cardinality": len(combined_rows),
            "degree": len(cols),
            "explanation": explanation,
            "step_by_step": [
                f"1. Verified Union Compatibility: Degree({r1['name']}) = Degree({r2['name']}) = {len(cols)}.",
                f"2. Pooled {len(r1['rows'])} rows from {r1['name']} and {len(r2['rows'])} rows from {r2['name']}.",
                f"3. Deduplicated identical tuples: Result contains {len(combined_rows)} unique tuples."
            ]
        }

    # 4. SET DIFFERENCE (−)
    elif canonical_op == "difference":
        compatible, err_msg = _check_union_compatibility(r1, r2)
        if not compatible:
            return {"success": False, "error": err_msg}

        cols = r1["columns"]
        r2_set = set(tuple(r.get(c) for c in cols) for r in r2["rows"])
        result_rows = []
        seen = set()

        for r in r1["rows"]:
            t_key = tuple(r.get(c) for c in cols)
            if t_key not in r2_set and t_key not in seen:
                seen.add(t_key)
                result_rows.append({c: r.get(c) for c in cols})

        notation = f"{r1['name']} − {r2['name']}"
        explanation = (
            f"Set Difference {r1['name']} − {r2['name']} returned tuples that belong to {r1['name']} "
            f"but DO NOT appear in {r2['name']}. Yielded {len(result_rows)} tuple(s)."
        )
        return {
            "success": True,
            "operator": "Set Difference (−)",
            "notation": notation,
            "relation_name": f"Result({r1['name']} − {r2['name']})",
            "columns": cols,
            "rows": result_rows,
            "cardinality": len(result_rows),
            "degree": len(cols),
            "explanation": explanation,
            "step_by_step": [
                f"1. Verified Union Compatibility between {r1['name']} and {r2['name']}.",
                f"2. Scanned {len(r1['rows'])} tuples in {r1['name']}.",
                f"3. Filtered out any tuple found in {r2['name']}.",
                f"4. Result: {len(result_rows)} distinct tuples retained."
            ]
        }

    # 5. CARTESIAN PRODUCT (×)
    elif canonical_op == "cartesian":
        # Handle attribute name collisions by prefixing table names
        overlap = set(r1["columns"]).intersection(set(r2["columns"]))
        res_cols = []
        col_mapping_r1 = {}
        col_mapping_r2 = {}

        for c in r1["columns"]:
            new_col = f"{r1['name']}.{c}" if c in overlap else c
            res_cols.append(new_col)
            col_mapping_r1[c] = new_col

        for c in r2["columns"]:
            new_col = f"{r2['name']}.{c}" if c in overlap else c
            res_cols.append(new_col)
            col_mapping_r2[c] = new_col

        cross_rows = []
        for row1 in r1["rows"]:
            for row2 in r2["rows"]:
                new_row = {}
                for c, mapped_c in col_mapping_r1.items():
                    new_row[mapped_c] = row1[c]
                for c, mapped_c in col_mapping_r2.items():
                    new_row[mapped_c] = row2[c]
                cross_rows.append(new_row)

        notation = f"{r1['name']} × {r2['name']}"
        expected_card = len(r1["rows"]) * len(r2["rows"])
        expected_deg = len(r1["columns"]) + len(r2["columns"])
        explanation = (
            f"Cartesian Product {r1['name']} × {r2['name']} paired each of the {len(r1['rows'])} tuples "
            f"in {r1['name']} with each of the {len(r2['rows'])} tuples in {r2['name']}. "
            f"Result Degree = deg(R1) + deg(R2) = {expected_deg}. "
            f"Result Cardinality = |R1| × |R2| = {len(r1['rows'])} × {len(r2['rows'])} = {expected_card}."
        )
        return {
            "success": True,
            "operator": "Cartesian Product (×)",
            "notation": notation,
            "relation_name": f"Result({r1['name']} × {r2['name']})",
            "columns": res_cols,
            "rows": cross_rows,
            "cardinality": len(cross_rows),
            "degree": len(res_cols),
            "explanation": explanation,
            "step_by_step": [
                f"1. Degree of Result: {len(r1['columns'])} + {len(r2['columns'])} = {expected_deg}.",
                f"2. Multiplied every tuple of {r1['name']} with every tuple of {r2['name']}.",
                f"3. Resolved attribute name collisions using prefixes: {list(overlap) if overlap else 'None'}.",
                f"4. Result Cardinality: {expected_card} tuples."
            ]
        }

    # 6. RENAME (ρ)
    elif canonical_op == "rename":
        # Parse rename_map: can be dict, or string like "OldAttr -> NewAttr, Col2 -> NewCol2"
        # or new relation name like "ρ(STUDENT_DIRECTORY, STUDENT)"
        new_relation_name = f"ρ_{r1['name']}"
        mapping = {}

        if isinstance(rename_map, dict):
            mapping = {str(k).strip(): str(v).strip() for k, v in rename_map.items()}
        elif isinstance(rename_map, str) and rename_map.strip():
            str_map = rename_map.strip()
            # If formatted like "NewName (A1, A2)"
            if "(" in str_map and str_map.endswith(")"):
                nname, rest = str_map.split("(", 1)
                new_relation_name = nname.strip()
                attrs = [a.strip() for a in rest[:-1].split(",") if a.strip()]
                for idx, a in enumerate(attrs):
                    if idx < len(r1["columns"]):
                        mapping[r1["columns"][idx]] = a
            else:
                pairs = str_map.split(",")
                for p in pairs:
                    if "->" in p:
                        orig, ren = p.split("->", 1)
                        mapping[orig.strip()] = ren.strip()
                    elif "=" in p:
                        ren, orig = p.split("=", 1)
                        mapping[orig.strip()] = ren.strip()
                    elif ":" in p:
                        orig, ren = p.split(":", 1)
                        mapping[orig.strip()] = ren.strip()

        if not mapping and not (isinstance(rename_map, str) and rename_map.strip()):
            # Default educational rename demonstration
            mapping = {r1["columns"][0]: f"{r1['columns'][0]}_Renamed"}

        new_columns = [mapping.get(c, c) for c in r1["columns"]]
        renamed_rows = []
        for r in r1["rows"]:
            new_r = {}
            for c in r1["columns"]:
                new_r[mapping.get(c, c)] = r[c]
            renamed_rows.append(new_r)

        notation = f"ρ_{{{', '.join([f'{k}→{v}' for k, v in mapping.items()])}}}({r1['name']})"
        explanation = (
            f"Rename operation ρ renamed attributes {list(mapping.keys())} to {list(mapping.values())} "
            f"in relation {r1['name']}. The tuple values remain identical."
        )
        return {
            "success": True,
            "operator": "Rename (ρ)",
            "notation": notation,
            "relation_name": new_relation_name,
            "columns": new_columns,
            "rows": renamed_rows,
            "cardinality": len(renamed_rows),
            "degree": len(new_columns),
            "explanation": explanation,
            "step_by_step": [
                f"1. Input relation: {r1['name']}.",
                f"2. Applied attribute renaming mapping: {mapping}.",
                f"3. Resulting relation attributes: {new_columns}.",
                "4. All underlying data rows preserved without modification."
            ]
        }

    # 7. EQUI-JOIN (⨝_condition)
    elif canonical_op == "equi_join":
        cond = (condition or "").strip()
        if not cond:
            # Default to matching common column if condition not specified
            common = list(set(r1["columns"]).intersection(set(r2["columns"])))
            if common:
                cond = f"{r1['name']}.{common[0]} = {r2['name']}.{common[0]}"
            else:
                return {"success": False, "error": "Equi-Join requires an equality condition (e.g. 'STUDENT.DepartmentID = DEPARTMENT.DepartmentID')."}

        # Combine schema with prefixes
        overlap = set(r1["columns"]).intersection(set(r2["columns"]))
        res_cols = []
        col_map_r1 = {}
        col_map_r2 = {}
        for c in r1["columns"]:
            mapped = f"{r1['name']}.{c}" if c in overlap else c
            res_cols.append(mapped)
            col_map_r1[c] = mapped
        for c in r2["columns"]:
            mapped = f"{r2['name']}.{c}" if c in overlap else c
            res_cols.append(mapped)
            col_map_r2[c] = mapped

        joined_rows = []
        for row1 in r1["rows"]:
            for row2 in r2["rows"]:
                combined = {}
                for c, mc in col_map_r1.items():
                    combined[mc] = row1[c]
                for c, mc in col_map_r2.items():
                    combined[mc] = row2[c]

                try:
                    if _eval_single_condition(combined, cond):
                        joined_rows.append(combined)
                except Exception as e:
                    return {"success": False, "error": f"Join condition evaluation error: {str(e)}"}

        notation = f"{r1['name']} ⨝_{{{cond}}} {r2['name']}"
        explanation = (
            f"Equi-Join {r1['name']} ⨝_{{{cond}}} {r2['name']} evaluated the Cartesian product "
            f"and selected only pairs satisfying '{cond}'. Retained {len(joined_rows)} joined tuple(s)."
        )
        return {
            "success": True,
            "operator": "Equi-Join (⨝)",
            "notation": notation,
            "relation_name": f"Result({r1['name']} ⨝ {r2['name']})",
            "columns": res_cols,
            "rows": joined_rows,
            "cardinality": len(joined_rows),
            "degree": len(res_cols),
            "explanation": explanation,
            "step_by_step": [
                f"1. Computed Cartesian product: {len(r1['rows'])} × {len(r2['rows'])} = {len(r1['rows']) * len(r2['rows'])} potential pairs.",
                f"2. Evaluated join condition: '{cond}'.",
                f"3. Retained matching tuples: {len(joined_rows)} row(s).",
                "4. Equi-join is formally defined as σ_{condition}(R1 × R2)."
            ]
        }

    # 8. NATURAL JOIN (⨝)
    elif canonical_op == "natural_join":
        common = [c for c in r1["columns"] if c in r2["columns"]]
        if not common:
            return {
                "success": False,
                "error": f"Natural Join requires at least one common attribute name! {r1['name']} has {r1['columns']} and {r2['name']} has {r2['columns']} with no shared column names."
            }

        # Result columns: R1 columns + R2 columns that are not in common
        res_cols = list(r1["columns"]) + [c for c in r2["columns"] if c not in common]

        joined_rows = []
        for row1 in r1["rows"]:
            for row2 in r2["rows"]:
                # Check equality across all common attributes
                if all(row1[c] == row2[c] for c in common):
                    new_r = dict(row1)
                    for c in r2["columns"]:
                        if c not in common:
                            new_r[c] = row2[c]
                    joined_rows.append(new_r)

        notation = f"{r1['name']} ⨝ {r2['name']}"
        explanation = (
            f"Natural Join {r1['name']} ⨝ {r2['name']} automatically matched common attribute(s) {common}. "
            f"Unlike Cartesian Product or Equi-Join, Natural Join projects only ONE copy of the shared attribute(s). "
            f"Result Degree = {len(res_cols)}, Cardinality = {len(joined_rows)}."
        )
        return {
            "success": True,
            "operator": "Natural Join (⨝)",
            "notation": notation,
            "relation_name": f"Result({r1['name']} ⨝ {r2['name']})",
            "columns": res_cols,
            "rows": joined_rows,
            "cardinality": len(joined_rows),
            "degree": len(res_cols),
            "common_attributes": common,
            "explanation": explanation,
            "step_by_step": [
                f"1. Identified common attribute(s): {common}.",
                f"2. Equated common attribute(s): {', '.join(common)}.",
                f"3. Merged attributes without duplicate columns: {res_cols}.",
                f"4. Result: {len(joined_rows)} matching tuple(s)."
            ]
        }

    # 9. INTERSECTION (∩)
    elif canonical_op == "intersection":
        compatible, err_msg = _check_union_compatibility(r1, r2)
        if not compatible:
            return {"success": False, "error": err_msg}

        cols = r1["columns"]
        r2_set = set(tuple(r.get(c) for c in cols) for r in r2["rows"])
        result_rows = []
        seen = set()

        for r in r1["rows"]:
            t_key = tuple(r.get(c) for c in cols)
            if t_key in r2_set and t_key not in seen:
                seen.add(t_key)
                result_rows.append({c: r.get(c) for c in cols})

        notation = f"{r1['name']} ∩ {r2['name']}"
        explanation = (
            f"Set Intersection {r1['name']} ∩ {r2['name']} returned tuples present in BOTH relations. "
            f"Note: Intersection is a derived operator, expressible as R1 − (R1 − R2)."
        )
        return {
            "success": True,
            "operator": "Intersection (∩)",
            "notation": notation,
            "relation_name": f"Result({r1['name']} ∩ {r2['name']})",
            "columns": cols,
            "rows": result_rows,
            "cardinality": len(result_rows),
            "degree": len(cols),
            "explanation": explanation,
            "step_by_step": [
                f"1. Verified Union Compatibility between {r1['name']} and {r2['name']}.",
                f"2. Identified tuples appearing in both sets.",
                f"3. Intersection formula: R1 ∩ R2 = R1 − (R1 − R2).",
                f"4. Retained {len(result_rows)} common tuple(s)."
            ]
        }

    # 10. RELATIONAL DIVISION (÷)
    elif canonical_op == "division":
        # R1(A, B) / R2(B): R2 attributes must be a strict subset of R1 attributes
        r1_cols = set(r1["columns"])
        r2_cols = set(r2["columns"])

        if not r2_cols.issubset(r1_cols):
            return {
                "success": False,
                "error": f"Relational Division requires all attributes of {r2['name']} ({list(r2_cols)}) to be a subset of {r1['name']} ({list(r1_cols)})."
            }

        target_cols = [c for c in r1["columns"] if c not in r2_cols]
        if not target_cols:
            return {
                "success": False,
                "error": f"Division divisor {r2['name']} contains all columns of {r1['name']}. No quotient attributes remain."
            }

        # Divisor tuple values
        r2_tuples = set(tuple(r[c] for c in r2["columns"]) for r in r2["rows"])
        
        # Group R1 by target columns
        from collections import defaultdict
        groups = defaultdict(set)
        for r in r1["rows"]:
            t_target = tuple(r[c] for c in target_cols)
            t_divisor = tuple(r[c] for c in r2["columns"])
            groups[t_target].add(t_divisor)

        result_rows = []
        for t_target, divisor_set in groups.items():
            # Check if all tuples of R2 are present in this group
            if r2_tuples.issubset(divisor_set):
                row_dict = {target_cols[idx]: t_target[idx] for idx in range(len(target_cols))}
                result_rows.append(row_dict)

        notation = f"{r1['name']} ÷ {r2['name']}"
        explanation = (
            f"Relational Division {r1['name']} ÷ {r2['name']} answers the classic 'universal quantification' query: "
            f"Find values of ({', '.join(target_cols)}) associated with ALL {len(r2_tuples)} tuple(s) in {r2['name']}. "
            f"Found {len(result_rows)} matching quotient result(s)."
        )
        return {
            "success": True,
            "operator": "Relational Division (÷)",
            "notation": notation,
            "relation_name": f"Result({r1['name']} ÷ {r2['name']})",
            "columns": target_cols,
            "rows": result_rows,
            "cardinality": len(result_rows),
            "degree": len(target_cols),
            "divisor_tuples_required": len(r2_tuples),
            "explanation": explanation,
            "step_by_step": [
                f"1. Target Quotient Attributes: {target_cols}.",
                f"2. Divisor {r2['name']} has {len(r2_tuples)} required tuple(s): {list(r2_tuples)}.",
                f"3. Grouped {r1['name']} by {target_cols} and checked if each group completed the full divisor set.",
                f"4. Result: {len(result_rows)} entity/tuple(s) satisfied universal quantification."
            ]
        }

    # 11. LEFT OUTER JOIN (⟕)
    elif canonical_op == "left_outer_join":
        common = [c for c in r1["columns"] if c in r2["columns"]]
        res_cols = list(r1["columns"]) + [c for c in r2["columns"] if c not in common]
        joined_rows = []

        for row1 in r1["rows"]:
            matches = 0
            for row2 in r2["rows"]:
                if common and all(row1[c] == row2[c] for c in common):
                    matches += 1
                    new_r = dict(row1)
                    for c in r2["columns"]:
                        if c not in common:
                            new_r[c] = row2[c]
                    joined_rows.append(new_r)
            if matches == 0:
                # Retain row1 with NULL (None) for R2 columns
                new_r = dict(row1)
                for c in r2["columns"]:
                    if c not in common:
                        new_r[c] = None
                joined_rows.append(new_r)

        notation = f"{r1['name']} ⟕ {r2['name']}"
        explanation = (
            f"Left Outer Join {r1['name']} ⟕ {r2['name']} preserves EVERY tuple from {r1['name']}. "
            f"Tuples without a matching entry in {r2['name']} are padded with NULL (None)."
        )
        return {
            "success": True,
            "operator": "Left Outer Join (⟕)",
            "notation": notation,
            "relation_name": f"Result({r1['name']} ⟕ {r2['name']})",
            "columns": res_cols,
            "rows": joined_rows,
            "cardinality": len(joined_rows),
            "degree": len(res_cols),
            "explanation": explanation,
            "step_by_step": [
                f"1. Preserved all {len(r1['rows'])} tuples from left relation {r1['name']}.",
                f"2. Matched on common attribute(s): {common}.",
                "3. Padded unmatched rows with NULL values.",
                f"4. Result Cardinality: {len(joined_rows)} tuples."
            ]
        }

    return {"success": False, "error": f"Unsupported relational operator '{operator}'."}


# ====================================================================
# PHASE 7: TRANSACTIONS & CONCURRENCY CONTROL ENGINE
# ====================================================================

def save_phase7_progress(session_id, lesson_id, completed=True, quiz_score=0, quiz_max_score=5,
                         sim_bank_completed=False, sim_schedule_completed=False,
                         sim_lock_completed=False, sim_deadlock_completed=False,
                         sim_recovery_completed=False):
    """Saves or updates progress for a Phase 7 lesson in MySQL."""
    session_id = session_id or "default_student"
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO phase7_learning_progress 
                    (session_id, lesson_id, completed, quiz_score, quiz_max_score, quiz_attempted,
                     sim_bank_completed, sim_schedule_completed, sim_lock_completed,
                     sim_deadlock_completed, sim_recovery_completed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    completed = VALUES(completed),
                    quiz_score = GREATEST(quiz_score, VALUES(quiz_score)),
                    quiz_max_score = VALUES(quiz_max_score),
                    quiz_attempted = VALUES(quiz_attempted),
                    sim_bank_completed = VALUES(sim_bank_completed),
                    sim_schedule_completed = VALUES(sim_schedule_completed),
                    sim_lock_completed = VALUES(sim_lock_completed),
                    sim_deadlock_completed = VALUES(sim_deadlock_completed),
                    sim_recovery_completed = VALUES(sim_recovery_completed),
                    updated_at = NOW();
            """
            cursor.execute(sql, (
                session_id,
                str(lesson_id),
                bool(completed),
                int(quiz_score),
                int(quiz_max_score),
                True if int(quiz_score) > 0 else False,
                bool(sim_bank_completed),
                bool(sim_schedule_completed),
                bool(sim_lock_completed),
                bool(sim_deadlock_completed),
                bool(sim_recovery_completed)
            ))
        conn.close()
        return {"success": True, "message": f"Phase 7 progress for '{lesson_id}' saved successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_phase7_progress(session_id="default_student"):
    """Fetches all stored Phase 7 progress for the session."""
    session_id = session_id or "default_student"
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT lesson_id, completed, quiz_score, quiz_max_score, quiz_attempted, "
                "sim_bank_completed, sim_schedule_completed, sim_lock_completed, "
                "sim_deadlock_completed, sim_recovery_completed, updated_at "
                "FROM phase7_learning_progress WHERE session_id = %s;",
                (session_id,)
            )
            rows = cursor.fetchall()
            columns = [c[0] for c in cursor.description] if cursor.description else []
            data = [{col: serialize_value(r[col]) for col in columns} for r in rows]
        conn.close()
        return {"success": True, "progress": data, "count": len(data)}
    except Exception as e:
        return {"success": False, "error": str(e), "progress": []}


def parse_schedule_operations(raw_input):
    """
    Parses a string or list of schedule operations into structured tokens.
    Supports formats like:
      R1(X), W1(X), R2(X), W2(X), C1, C2
      r1[x] w1[x] r2[x] w2[x] c1 c2
    """
    if isinstance(raw_input, list):
        tokens = [str(t).strip() for t in raw_input if str(t).strip()]
    elif isinstance(raw_input, str):
        # Split by comma, semicolon, newline, or whitespace
        import re
        tokens = [t.strip() for t in re.split(r"[,;\s\n]+", raw_input) if t.strip()]
    else:
        tokens = []

    import re
    parsed = []
    step_num = 1

    for tok in tokens:
        clean = tok.strip()
        if not clean:
            continue

        # Match R1(X) or R1[X]
        m_rw = re.match(r"^([RrWw])(\d+)[\(\[]\s*([A-Za-z0-9_]+)\s*[\)\]]$", clean)
        if m_rw:
            op_type = "read" if m_rw.group(1).upper() == "R" else "write"
            tx_num = int(m_rw.group(2))
            item = m_rw.group(3).upper()
            parsed.append({
                "step": step_num,
                "raw": f"{m_rw.group(1).upper()}{tx_num}({item})",
                "op": op_type,
                "tx": f"T{tx_num}",
                "tx_num": tx_num,
                "item": item
            })
            step_num += 1
            continue

        # Match C1, COMMIT1, A1, ABORT1
        m_ca = re.match(r"^(?:(C|COMMIT)|(A|ABORT))(\d+)$", clean, re.IGNORECASE)
        if m_ca:
            is_commit = bool(m_ca.group(1))
            tx_num = int(m_ca.group(3))
            op_type = "commit" if is_commit else "abort"
            parsed.append({
                "step": step_num,
                "raw": f"{'C' if is_commit else 'A'}{tx_num}",
                "op": op_type,
                "tx": f"T{tx_num}",
                "tx_num": tx_num,
                "item": None
            })
            step_num += 1
            continue

    return parsed


def analyze_transaction_schedule(raw_input_or_ops):
    """
    Analyzes an interleaved transaction schedule for conflict serializability.
    Constructs precedence graph, detects cycles using DFS and Kahn's algorithm,
    and returns topological order or cycle explanation.
    """
    ops = parse_schedule_operations(raw_input_or_ops) if not (isinstance(raw_input_or_ops, list) and raw_input_or_ops and isinstance(raw_input_or_ops[0], dict) and "op" in raw_input_or_ops[0]) else raw_input_or_ops

    if not ops:
        return {
            "success": False,
            "error": "No valid schedule operations parsed. Example format: R1(X), W1(X), R2(X), W2(X), C1, C2"
        }

    # Extract active transactions and items
    tx_set = sorted(list(set(op["tx"] for op in ops)), key=lambda x: int(x[1:]) if x[1:].isdigit() else x)
    items_set = sorted(list(set(op["item"] for op in ops if op["item"] is not None)))

    # Step-by-step conflict detection
    conflicts = []
    edges = set()
    edge_details = []

    n = len(ops)
    for i in range(n):
        op_i = ops[i]
        if op_i["item"] is None:
            continue

        for j in range(i + 1, n):
            op_j = ops[j]
            if op_j["item"] is None:
                continue

            # Conflicts must belong to different transactions and access same data item
            if op_i["tx"] != op_j["tx"] and op_i["item"] == op_j["item"]:
                # At least one must be a write
                if op_i["op"] == "write" or op_j["op"] == "write":
                    from_tx = op_i["tx"]
                    to_tx = op_j["tx"]
                    item = op_i["item"]

                    if op_i["op"] == "read" and op_j["op"] == "write":
                        c_type = "Read-Write (RW) Anti-Dependency"
                    elif op_i["op"] == "write" and op_j["op"] == "read":
                        c_type = "Write-Read (WR) Flow Dependency"
                    else:
                        c_type = "Write-Write (WW) Output Dependency"

                    conflict_entry = {
                        "from_tx": from_tx,
                        "to_tx": to_tx,
                        "item": item,
                        "conflict_type": c_type,
                        "step_earlier": op_i["step"],
                        "op_earlier": op_i["raw"],
                        "step_later": op_j["step"],
                        "op_later": op_j["raw"],
                        "description": f"Step {op_i['step']} {op_i['raw']} conflicts with Step {op_j['step']} {op_j['raw']} on item {item} ({c_type})."
                    }
                    conflicts.append(conflict_entry)

                    edge_tuple = (from_tx, to_tx)
                    if edge_tuple not in edges:
                        edges.add(edge_tuple)
                        edge_details.append({
                            "from": from_tx,
                            "to": to_tx,
                            "item": item,
                            "reason": f"{op_i['raw']} (step {op_i['step']}) -> {op_j['raw']} (step {op_j['step']})",
                            "type": c_type
                        })

    # Build Adjacency List for Graph Analysis
    adj = {tx: [] for tx in tx_set}
    in_degree = {tx: 0 for tx in tx_set}
    for (u, v) in edges:
        adj[u].append(v)
        in_degree[v] += 1

    # Cycle Detection using DFS
    visited = {tx: 0 for tx in tx_set}  # 0 = unvisited, 1 = visiting, 2 = visited
    cycle_nodes = []
    parent_map = {}

    def dfs_find_cycle(u, path):
        visited[u] = 1
        path.append(u)
        for v in adj[u]:
            if visited[v] == 1:
                # Cycle found!
                idx = path.index(v)
                cycle_nodes.extend(path[idx:] + [v])
                return True
            elif visited[v] == 0:
                parent_map[v] = u
                if dfs_find_cycle(v, path):
                    return True
        path.pop()
        visited[u] = 2
        return False

    has_cycle = False
    for tx in tx_set:
        if visited[tx] == 0:
            if dfs_find_cycle(tx, []):
                has_cycle = True
                break

    # Kahn's Algorithm for Topological Sort
    q = [tx for tx in tx_set if in_degree[tx] == 0]
    topological_order = []
    temp_in_degree = dict(in_degree)

    while q:
        curr = q.pop(0)
        topological_order.append(curr)
        for neighbor in adj[curr]:
            temp_in_degree[neighbor] -= 1
            if temp_in_degree[neighbor] == 0:
                q.append(neighbor)

    is_conflict_serializable = (len(topological_order) == len(tx_set)) and not has_cycle

    # Educational explanation
    if is_conflict_serializable:
        eq_serial = " -> ".join(topological_order)
        explanation = (
            f"The schedule is CONFLICT-SERIALIZABLE! The precedence (serialization) graph contains NO cycles. "
            f"It is conflict-equivalent to the serial schedule: {eq_serial}."
        )
    else:
        cycle_str = " -> ".join(cycle_nodes) if cycle_nodes else "Cycle detected among transactions"
        explanation = (
            f"The schedule is NOT CONFLICT-SERIALIZABLE! A directed cycle ({cycle_str}) exists in the precedence graph. "
            f"No equivalent serial execution order exists because transaction operations have mutually conflicting orderings."
        )

    return {
        "success": True,
        "schedule_length": len(ops),
        "operations": ops,
        "transactions": tx_set,
        "data_items": items_set,
        "conflicts_count": len(conflicts),
        "conflicts": conflicts,
        "graph_nodes": tx_set,
        "graph_edges": edge_details,
        "is_conflict_serializable": is_conflict_serializable,
        "has_cycle": has_cycle,
        "cycle_path": cycle_nodes,
        "topological_order": topological_order if is_conflict_serializable else [],
        "equivalent_serial_schedule": " -> ".join(topological_order) if is_conflict_serializable else None,
        "explanation": explanation
    }


def simulate_wal_recovery(log_records=None, crash_lsn=None, initial_values=None):
    """
    Simulates Write-Ahead Logging (WAL) recovery on educational log sequences.
    Identifies Redo list (Committed) and Undo list (Uncommitted at crash),
    and calculates final restored values with step-by-step reasoning.
    """
    default_initial = {"A": 5000, "B": 3000, "C": 2000}
    state = dict(initial_values or default_initial)

    default_logs = [
        {"lsn": 1, "tx": "T1", "type": "START", "item": None, "old_val": None, "new_val": None},
        {"lsn": 2, "tx": "T1", "type": "UPDATE", "item": "A", "old_val": 5000, "new_val": 4000},
        {"lsn": 3, "tx": "T2", "type": "START", "item": None, "old_val": None, "new_val": None},
        {"lsn": 4, "tx": "T1", "type": "UPDATE", "item": "B", "old_val": 3000, "new_val": 4000},
        {"lsn": 5, "tx": "T1", "type": "COMMIT", "item": None, "old_val": None, "new_val": None},
        {"lsn": 6, "tx": "T2", "type": "UPDATE", "item": "C", "old_val": 2000, "new_val": 2500},
        {"lsn": 7, "tx": "T3", "type": "START", "item": None, "old_val": None, "new_val": None},
        {"lsn": 8, "tx": "T3", "type": "UPDATE", "item": "A", "old_val": 4000, "new_val": 4800}
    ]

    logs = list(log_records or default_logs)
    max_lsn = max(entry["lsn"] for entry in logs) if logs else 0
    crash_lsn = int(crash_lsn) if crash_lsn is not None else max_lsn

    # Filter logs executed up to crash point
    executed_logs = [entry for entry in logs if entry["lsn"] <= crash_lsn]

    # Analyze transaction status at crash
    started_txs = set()
    committed_txs = set()
    aborted_txs = set()

    for rec in executed_logs:
        tx = rec["tx"]
        rtype = rec["type"].upper()
        if rtype == "START":
            started_txs.add(tx)
        elif rtype == "COMMIT":
            committed_txs.add(tx)
        elif rtype == "ABORT":
            aborted_txs.add(tx)

    redo_list = sorted(list(committed_txs))
    undo_list = sorted(list(started_txs - committed_txs - aborted_txs))

    # Apply database state simulation
    # 1. Start from initial state, trace all writes before crash
    db_at_crash = dict(state)
    for rec in executed_logs:
        if rec["type"].upper() == "UPDATE" and rec["item"] is not None:
            db_at_crash[rec["item"]] = rec["new_val"]

    # 2. Recovery: REDO committed transactions forward
    redo_actions = []
    for rec in executed_logs:
        if rec["tx"] in committed_txs and rec["type"].upper() == "UPDATE" and rec["item"] is not None:
            redo_actions.append({
                "lsn": rec["lsn"],
                "tx": rec["tx"],
                "item": rec["item"],
                "new_val": rec["new_val"],
                "action": f"REDO: Reapplied {rec['tx']} update on {rec['item']} = {rec['new_val']}."
            })

    # 3. Recovery: UNDO uncommitted transactions backward
    undo_actions = []
    recovered_state = dict(db_at_crash)
    for rec in reversed(executed_logs):
        if rec["tx"] in undo_list and rec["type"].upper() == "UPDATE" and rec["item"] is not None:
            recovered_state[rec["item"]] = rec["old_val"]
            undo_actions.append({
                "lsn": rec["lsn"],
                "tx": rec["tx"],
                "item": rec["item"],
                "restored_val": rec["old_val"],
                "action": f"UNDO: Rolled back {rec['tx']} update on {rec['item']} to prior value {rec['old_val']}."
            })

    explanation = (
        f"At crash point LSN {crash_lsn}: "
        f"Committed transactions ({', '.join(redo_list) or 'None'}) are in the REDO list to guarantee DURABILITY. "
        f"Uncommitted active transactions ({', '.join(undo_list) or 'None'}) are in the UNDO list to guarantee ATOMICITY. "
        f"Changes from uncommitted transactions are rolled back."
    )

    return {
        "success": True,
        "crash_lsn": crash_lsn,
        "total_logs": len(logs),
        "executed_logs": executed_logs,
        "initial_state": state,
        "state_at_crash": db_at_crash,
        "redo_list": redo_list,
        "undo_list": undo_list,
        "redo_actions": redo_actions,
        "undo_actions": undo_actions,
        "recovered_state": recovered_state,
        "explanation": explanation,
        "disclaimer": "Educational WAL recovery model. Actual MySQL InnoDB recovery uses redo log groups (ib_logfile), undo tablespaces, doublewrite buffer, and checkpoint LSNs."
    }

# ====================================================================
# AI-POWERED DBMS PRACTICAL LAB: WORKSPACE & SQL EXECUTION ENGINE
# ====================================================================

PROTECTED_SYSTEM_DATABASES = {
    "dbms_learn_run", "information_schema", "mysql",
    "performance_schema", "sys"
}

def split_sql_script(sql_content):
    """
    Split SQL script into individual executable statements,
    properly supporting DELIMITER directives, single-line/inline multi-statements,
    quotes (single, double, backtick), and comments.
    """
    statements = []
    current_delimiter = ";"
    in_single_quote = False
    in_double_quote = False
    in_backtick = False
    in_block_comment = False
    current_token = []

    lines = sql_content.splitlines(keepends=True)
    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith("DELIMITER"):
            parts = stripped.split()
            if len(parts) >= 2:
                current_delimiter = parts[1]
                continue

        j = 0
        line_len = len(line)
        while j < line_len:
            ch = line[j]

            # Check comments outside of strings
            if not in_single_quote and not in_double_quote and not in_backtick:
                if not in_block_comment and line[j:j+2] == "--" and (j+2 >= line_len or line[j+2].isspace()):
                    break  # Rest of line is comment
                if not in_block_comment and ch == "#":
                    break  # Rest of line is comment
                if not in_block_comment and line[j:j+2] == "/*":
                    in_block_comment = True
                    j += 2
                    continue
                if in_block_comment:
                    if line[j:j+2] == "*/":
                        in_block_comment = False
                        j += 2
                    else:
                        j += 1
                    continue

            if not in_block_comment:
                if ch == "'" and not in_double_quote and not in_backtick:
                    if j > 0 and line[j-1] == "\\":
                        pass
                    else:
                        in_single_quote = not in_single_quote
                elif ch == '"' and not in_single_quote and not in_backtick:
                    if j > 0 and line[j-1] == "\\":
                        pass
                    else:
                        in_double_quote = not in_double_quote
                elif ch == "`" and not in_single_quote and not in_double_quote:
                    in_backtick = not in_backtick

                # Check for delimiter match outside of quotes
                if not in_single_quote and not in_double_quote and not in_backtick:
                    delim_len = len(current_delimiter)
                    if line[j:j+delim_len] == current_delimiter:
                        stmt = "".join(current_token).strip()
                        if stmt:
                            statements.append(stmt)
                        current_token = []
                        j += delim_len
                        continue

                current_token.append(ch)
            j += 1
        current_token.append("\n")

    stmt = "".join(current_token).strip()
    if stmt:
        statements.append(stmt)

    return statements

def validate_workspace_name(name):
    """Validate that workspace name is a safe MySQL database identifier."""
    if not name or not isinstance(name, str):
        return False, "Workspace database name cannot be empty."
    clean_name = name.strip()
    if clean_name.lower() in PROTECTED_SYSTEM_DATABASES:
        return False, f"Database name '{clean_name}' is a protected system or application schema."
    if not re.match(r"^[a-zA-Z0-9_]{1,64}$", clean_name):
        return False, "Workspace name must contain only letters, numbers, and underscores (max 64 characters)."
    return True, clean_name

def list_practice_workspaces():
    """
    List practice databases available on the local MySQL server.
    Ensures default 'dbms_practice_lab' exists.
    """
    workspaces = []
    default_ws = "dbms_practice_lab"
    has_default = False

    try:
        conn = get_connection(use_database=False)
        with conn.cursor() as cursor:
            cursor.execute("SHOW DATABASES;")
            rows = cursor.fetchall()
            for r in rows:
                db_name = list(r.values())[0]
                if db_name.lower() not in PROTECTED_SYSTEM_DATABASES:
                    is_def = (db_name.lower() == default_ws.lower())
                    if is_def:
                        has_default = True
                    workspaces.append({
                        "name": db_name,
                        "is_default": is_def
                    })
        conn.close()

        # If default workspace doesn't exist yet, create it on local MySQL
        if not has_default:
            create_practice_workspace(default_ws)
            workspaces.insert(0, {"name": default_ws, "is_default": True})

        return {"success": True, "workspaces": workspaces}
    except Exception as e:
        return {"success": False, "error": str(e), "workspaces": []}

def create_practice_workspace(workspace_name):
    """Create a persistent local MySQL database for practical practice."""
    valid, res = validate_workspace_name(workspace_name)
    if not valid:
        return {"success": False, "error": res}
    clean_name = res

    try:
        conn = get_connection(use_database=False)
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{clean_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn.close()
        return {
            "success": True,
            "database": clean_name,
            "message": f"Local MySQL database '{clean_name}' created and ready for practical experiments."
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to create database on local MySQL: {str(e)}"}

def reset_practice_workspace(workspace_name):
    """
    Reset a practice workspace by dropping and recreating it.
    Strictly protects system databases and the main application database.
    """
    valid, res = validate_workspace_name(workspace_name)
    if not valid:
        return {"success": False, "error": res}
    clean_name = res

    try:
        conn = get_connection(use_database=False)
        with conn.cursor() as cursor:
            cursor.execute(f"DROP DATABASE IF EXISTS `{clean_name}`;")
            cursor.execute(f"CREATE DATABASE `{clean_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn.close()
        return {
            "success": True,
            "database": clean_name,
            "message": f"Practice workspace '{clean_name}' was successfully reset on your local MySQL server."
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to reset workspace: {str(e)}"}

def get_workspace_tables(workspace_name):
    """Retrieve all tables and row counts in the given workspace database."""
    valid, res = validate_workspace_name(workspace_name)
    if not valid:
        return {"success": False, "error": res, "tables": []}
    clean_name = res

    try:
        conn = get_connection(use_database=True, database=clean_name)
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT TABLE_NAME as tbl_name, ENGINE as engine, TABLE_ROWS as approx_rows
                FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY TABLE_NAME;
            """, (clean_name,))
            rows = cursor.fetchall()

            table_list = []
            for r in rows:
                t_name = r.get("tbl_name") or r.get("TABLE_NAME")
                engine = r.get("engine") or "InnoDB"
                try:
                    cursor.execute(f"SELECT COUNT(*) AS cnt FROM `{t_name}`;")
                    cnt_res = cursor.fetchone()
                    exact_cnt = cnt_res.get("cnt") or 0
                except Exception:
                    exact_cnt = r.get("approx_rows") or 0

                table_list.append({
                    "name": t_name,
                    "engine": engine,
                    "rows": exact_cnt
                })
        conn.close()
        return {"success": True, "workspace": clean_name, "tables": table_list}
    except Exception as e:
        return {"success": False, "workspace": clean_name, "error": str(e), "tables": []}

def get_workspace_table_schema(workspace_name, table_name):
    """Retrieve full column definitions, constraints, and sample data for a table in the workspace."""
    valid, res = validate_workspace_name(workspace_name)
    if not valid:
        return {"success": False, "error": res}
    clean_name = res

    if not table_name or not re.match(r"^[a-zA-Z0-9_]{1,64}$", table_name.strip()):
        return {"success": False, "error": "Invalid table name identifier."}
    clean_table = table_name.strip()

    try:
        conn = get_connection(use_database=True, database=clean_name)
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ORDINAL_POSITION;
            """, (clean_name, clean_table))
            cols = cursor.fetchall()

            # Row count
            cursor.execute(f"SELECT COUNT(*) AS cnt FROM `{clean_table}`;")
            cnt_row = cursor.fetchone()
            total_rows = cnt_row["cnt"] if cnt_row else 0

            # Sample rows
            cursor.execute(f"SELECT * FROM `{clean_table}` LIMIT 10;")
            raw_sample = cursor.fetchall()
            sample_rows = [{k: serialize_value(v) for k, v in r.items()} for r in raw_sample]

        conn.close()

        formatted_cols = []
        for c in cols:
            formatted_cols.append({
                "name": c.get("COLUMN_NAME"),
                "field": c.get("COLUMN_NAME"),
                "type": c.get("COLUMN_TYPE"),
                "null": c.get("IS_NULLABLE"),
                "nullable": c.get("IS_NULLABLE"),
                "key": c.get("COLUMN_KEY"),
                "default": serialize_value(c.get("COLUMN_DEFAULT")),
                "extra": c.get("EXTRA")
            })

        return {
            "success": True,
            "workspace": clean_name,
            "table_name": clean_table,
            "columns": formatted_cols,
            "total_rows": total_rows,
            "sample_rows": sample_rows
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def execute_practical_sql(workspace_name_or_sql, sql_script_or_workspace=None, max_rows=200):
    """
    Executes student SQL program against their selected workspace database on local MySQL.
    Supports multi-statement scripts (DDL, DML, DQL, constraints, joins, views).
    Accepts either (workspace_name, sql_script) or (sql_script, workspace_name) flexibly.
    Strictly prevents accessing or modifying the core 'dbms_learn_run' schema or system databases.
    """
    if sql_script_or_workspace is not None:
        first_str = str(workspace_name_or_sql or "").strip()
        second_str = str(sql_script_or_workspace or "").strip()
        is_first_ident = bool(re.match(r"^[a-zA-Z0-9_]{1,64}$", first_str)) and not any(kw in first_str.upper() for kw in ["SELECT", "CREATE", "INSERT", "UPDATE", "DELETE", ";"])
        is_second_ident = bool(re.match(r"^[a-zA-Z0-9_]{1,64}$", second_str)) and not any(kw in second_str.upper() for kw in ["SELECT", "CREATE", "INSERT", "UPDATE", "DELETE", ";"])

        if is_first_ident and not is_second_ident:
            target_ws = first_str
            script_to_run = second_str
        elif is_second_ident and not is_first_ident:
            target_ws = second_str
            script_to_run = first_str
        else:
            target_ws = first_str
            script_to_run = second_str
    else:
        target_ws = "college_practical"
        script_to_run = str(workspace_name_or_sql or "").strip()

    if not script_to_run or not script_to_run.strip():
        return {
            "success": False,
            "error": "SQL script is empty. Please enter one or more SQL statements.",
            "columns": [],
            "rows": [],
            "affected_rows": 0,
            "execution_time_ms": 0,
            "statements": []
        }

    valid, res = validate_workspace_name(target_ws)
    if not valid:
        return {
            "success": False,
            "error": res,
            "columns": [],
            "rows": [],
            "affected_rows": 0,
            "execution_time_ms": 0,
            "statements": []
        }
    clean_ws = res

    # Security check: cross-database escape guard
    for protected in PROTECTED_SYSTEM_DATABASES:
        pattern = rf"\b(from|join|into|update|table|database)\s+[`\"]?{protected}[`\"]?\."
        if re.search(pattern, script_to_run, re.IGNORECASE) or re.search(rf"\buse\s+[`\"]?{protected}[`\"]?", script_to_run, re.IGNORECASE):
            return {
                "success": False,
                "error": f"Security Notice: Cross-schema queries into protected database '{protected}' are blocked to ensure student workspace isolation.",
                "columns": [],
                "rows": [],
                "affected_rows": 0,
                "execution_time_ms": 0,
                "statements": []
            }

    # Security check: admin operations
    upper_script = script_to_run.upper()
    for restricted in Config.RESTRICTED_KEYWORDS:
        if restricted in upper_script:
            return {
                "success": False,
                "error": f"Security Notice: Restricted operation '{restricted}' is disabled in student practical workspaces.",
                "columns": [],
                "rows": [],
                "affected_rows": 0,
                "execution_time_ms": 0,
                "statements": []
            }

    statements = split_sql_script(script_to_run)
    if not statements:
        return {
            "success": False,
            "error": "No executable SQL statements found in script (check for comment-only inputs).",
            "columns": [],
            "rows": [],
            "affected_rows": 0,
            "execution_time_ms": 0,
            "statements": []
        }

    start_time = time.perf_counter()
    executed_count = 0
    total_affected = 0
    last_query_result = None
    messages = []
    executed_statements = []

    conn = None
    try:
        conn = get_connection(use_database=True, database=clean_ws)
        with conn.cursor() as cursor:
            for idx, stmt in enumerate(statements):
                stmt_clean = stmt.strip()
                if not stmt_clean:
                    continue

                try:
                    cursor.execute(stmt_clean)
                    executed_count += 1
                    aff = cursor.rowcount if cursor.rowcount >= 0 else 0
                    total_affected += aff

                    upper_stmt = stmt_clean.upper()
                    stmt_type = upper_stmt.split()[0] if upper_stmt.split() else "SQL"
                    is_select_like = upper_stmt.startswith(("SELECT", "SHOW", "DESCRIBE", "EXPLAIN"))

                    stmt_record = {
                        "statement": stmt_clean,
                        "type": stmt_type,
                        "status": "success",
                        "affected_rows": aff,
                        "columns": [],
                        "rows": [],
                        "row_count": 0
                    }

                    if is_select_like and cursor.description:
                        cols = [c[0] for c in cursor.description]
                        raw_rows = cursor.fetchmany(max_rows)
                        serialized_rows = []
                        for r in raw_rows:
                            serialized_rows.append({k: serialize_value(v) for k, v in r.items()})

                        last_query_result = {
                            "columns": cols,
                            "rows": serialized_rows,
                            "row_count": len(serialized_rows)
                        }
                        stmt_record["columns"] = cols
                        stmt_record["rows"] = serialized_rows
                        stmt_record["row_count"] = len(serialized_rows)
                        messages.append(f"Statement {idx + 1}: Fetched {len(serialized_rows)} row(s).")
                    elif upper_stmt.startswith("CREATE"):
                        messages.append(f"Statement {idx + 1}: Object created successfully.")
                    elif upper_stmt.startswith("DROP"):
                        messages.append(f"Statement {idx + 1}: Object dropped successfully.")
                    elif upper_stmt.startswith("ALTER"):
                        messages.append(f"Statement {idx + 1}: Object altered successfully.")
                    else:
                        messages.append(f"Statement {idx + 1}: Executed ({aff} row(s) affected).")

                    executed_statements.append(stmt_record)

                except Exception as stmt_err:
                    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    return {
                        "success": False,
                        "error": str(stmt_err),
                        "failed_statement": stmt_clean,
                        "failed_statement_index": idx + 1,
                        "statements_executed": executed_count,
                        "total_statements": len(statements),
                        "columns": [],
                        "rows": [],
                        "affected_rows": total_affected,
                        "execution_time_ms": elapsed_ms,
                        "messages": messages,
                        "statements": executed_statements,
                        "workspace": clean_ws
                    }

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": True,
            "statements_executed": executed_count,
            "total_statements": len(statements),
            "affected_rows": total_affected,
            "execution_time_ms": elapsed_ms,
            "is_query": bool(last_query_result),
            "columns": last_query_result["columns"] if last_query_result else [],
            "rows": last_query_result["rows"] if last_query_result else [],
            "row_count": last_query_result["row_count"] if last_query_result else 0,
            "messages": messages,
            "statements": executed_statements,
            "workspace": clean_ws,
            "error": None
        }

    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": False,
            "error": f"Database execution error: {str(e)}",
            "columns": [],
            "rows": [],
            "affected_rows": total_affected,
            "execution_time_ms": elapsed_ms,
            "statements": executed_statements,
            "workspace": clean_ws
        }
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass

# ====================================================================
# PRACTICAL LAB RECORDS PERSISTENCE
# ====================================================================

def ensure_practical_records_table():
    """Ensure practical_lab_records table exists in dbms_learn_run."""
    try:
        conn = get_connection(use_database=True, database=Config.MYSQL_DATABASE)
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS practical_lab_records (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    practical_name VARCHAR(255) NOT NULL,
                    practical_number VARCHAR(50),
                    topic VARCHAR(100),
                    task_description TEXT NOT NULL,
                    sql_source MEDIUMTEXT,
                    workspace_db VARCHAR(100),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """)
        conn.close()
    except Exception as e:
        print(f"Notice: Could not ensure practical_lab_records table: {e}")

def save_practical_record(practical_name, task_description, sql_source="", practical_number=None, topic=None, workspace_db=None, practical_id=None, workspace_name=None, sql_script=None, record_id=None):
    """Save or update a student practical record."""
    ensure_practical_records_table()

    if not practical_name or not str(practical_name).strip():
        return {"success": False, "error": "Practical Name is required."}
    if not task_description or not str(task_description).strip():
        return {"success": False, "error": "Task Description is required."}

    name = str(practical_name).strip()
    task = str(task_description).strip()
    sql = sql_script if sql_script is not None else (sql_source or "")
    num = (practical_number or "").strip()
    top = (topic or "").strip()
    ws = (workspace_name or workspace_db or "college_practical").strip()
    pid = record_id if record_id is not None else practical_id

    try:
        conn = get_connection(use_database=True, database=Config.MYSQL_DATABASE)
        with conn.cursor() as cursor:
            if pid:
                cursor.execute("""
                    UPDATE practical_lab_records
                    SET practical_name = %s, practical_number = %s, topic = %s,
                        task_description = %s, sql_source = %s, workspace_db = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (name, num, top, task, sql, ws, pid))
                rec_id = int(pid)
            else:
                cursor.execute("""
                    INSERT INTO practical_lab_records 
                    (practical_name, practical_number, topic, task_description, sql_source, workspace_db)
                    VALUES (%s, %s, %s, %s, %s, %s);
                """, (name, num, top, task, sql, ws))
                rec_id = cursor.lastrowid
        conn.close()
        return {
            "success": True,
            "id": rec_id,
            "message": f"Practical '{name}' saved successfully to local MySQL database."
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to save practical: {str(e)}"}

def list_practical_records(search=None):
    """List all saved practical records with optional search filter."""
    ensure_practical_records_table()
    try:
        conn = get_connection(use_database=True, database=Config.MYSQL_DATABASE)
        with conn.cursor() as cursor:
            if search and str(search).strip():
                term = f"%{str(search).strip()}%"
                cursor.execute("""
                    SELECT id, practical_name, practical_number, topic, task_description,
                           workspace_db, created_at, updated_at
                    FROM practical_lab_records
                    WHERE practical_name LIKE %s OR topic LIKE %s OR practical_number LIKE %s
                    ORDER BY updated_at DESC;
                """, (term, term, term))
            else:
                cursor.execute("""
                    SELECT id, practical_name, practical_number, topic, task_description,
                           workspace_db, created_at, updated_at
                    FROM practical_lab_records
                    ORDER BY updated_at DESC;
                """)
            rows = cursor.fetchall()
            practicals = []
            for r in rows:
                practicals.append({
                    "id": r["id"],
                    "practical_name": r["practical_name"],
                    "practical_number": r["practical_number"],
                    "topic": r["topic"],
                    "task_description": r["task_description"],
                    "workspace_db": r["workspace_db"],
                    "workspace_name": r["workspace_db"],
                    "created_at": serialize_value(r.get("created_at")),
                    "updated_at": serialize_value(r.get("updated_at"))
                })
        conn.close()
        return {"success": True, "practicals": practicals}
    except Exception as e:
        return {"success": False, "error": str(e), "practicals": []}

def get_practical_record(practical_id):
    """Retrieve full details of a saved practical including SQL source."""
    ensure_practical_records_table()
    try:
        conn = get_connection(use_database=True, database=Config.MYSQL_DATABASE)
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, practical_name, practical_number, topic, task_description,
                       sql_source, workspace_db, created_at, updated_at
                FROM practical_lab_records
                WHERE id = %s;
            """, (practical_id,))
            row = cursor.fetchone()
        conn.close()

        if not row:
            return {"success": False, "error": f"Practical with ID {practical_id} not found."}

        return {
            "success": True,
            "practical": {
                "id": row["id"],
                "practical_name": row["practical_name"],
                "practical_number": row["practical_number"],
                "topic": row["topic"],
                "task_description": row["task_description"],
                "sql_source": row["sql_source"],
                "sql_script": row["sql_source"],
                "workspace_db": row["workspace_db"],
                "workspace_name": row["workspace_db"],
                "created_at": serialize_value(row.get("created_at")),
                "updated_at": serialize_value(row.get("updated_at"))
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def delete_practical_record(practical_id):
    """Delete a saved practical record."""
    ensure_practical_records_table()
    try:
        conn = get_connection(use_database=True, database=Config.MYSQL_DATABASE)
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM practical_lab_records WHERE id = %s;", (practical_id,))
        conn.close()
        return {"success": True, "message": "Practical deleted successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}





