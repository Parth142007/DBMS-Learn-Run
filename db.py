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
    """Drops and recreates the practice_students table with 5 clean sample rows."""
    setup_statements = [
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
        ('P105', 'Varun', 'Deshmukh', 'MECH', 6.80, 'Hubballi', '2026-08-03');"""
    ]
    try:
        conn = get_connection(use_database=True)
        with conn.cursor() as cursor:
            for stmt in setup_statements:
                cursor.execute(stmt)
        conn.close()
        return {"success": True, "message": "Practice table 'practice_students' successfully reset with 5 rows."}
    except Exception as e:
        return {"success": False, "error": str(e)}
