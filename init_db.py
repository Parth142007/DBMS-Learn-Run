"""
DBMS Learn & Run: Database Initialization Script
Runs the SQL files against your MySQL server and sets up dbms_learn_run schema with sample data.

Usage:
    python init_db.py
    python init_db.py --password your_mysql_password
"""

import os
import sys
import argparse
import re
import pymysql
from config import Config

def parse_args():
    parser = argparse.ArgumentParser(description="Initialize the dbms_learn_run MySQL database.")
    parser.add_argument("--host", default=Config.MYSQL_HOST, help="MySQL Host (default: localhost)")
    parser.add_argument("--port", type=int, default=Config.MYSQL_PORT, help="MySQL Port (default: 3306)")
    parser.add_argument("--user", default=Config.MYSQL_USER, help="MySQL User (default: root)")
    parser.add_argument("--password", default=Config.MYSQL_PASSWORD, help="MySQL Password")
    return parser.parse_args()

def split_sql_statements(sql_content):
    """
    Split SQL script into individual executable statements,
    handling DELIMITER $$ and standard semicolon delimiters.
    """
    statements = []
    current_delimiter = ";"
    buffer = []

    for line in sql_content.splitlines():
        stripped = line.strip()

        # Handle DELIMITER change directive
        if stripped.upper().startswith("DELIMITER"):
            parts = stripped.split()
            if len(parts) >= 2:
                current_delimiter = parts[1]
            continue

        if not stripped or stripped.startswith("--") or stripped.startswith("/*"):
            continue

        buffer.append(line)

        # Check if the buffer ends with current delimiter
        joined = "\n".join(buffer).strip()
        if joined.endswith(current_delimiter):
            stmt = joined[:-len(current_delimiter)].strip()
            if stmt:
                statements.append(stmt)
            buffer = []

    if buffer:
        remaining = "\n".join(buffer).strip()
        if remaining:
            statements.append(remaining)

    return statements

def execute_sql_file(cursor, file_path):
    print(f" -> Executing {os.path.basename(file_path)}...")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    statements = split_sql_statements(content)
    executed_count = 0
    for stmt in statements:
        # Ignore comments or pure SELECT status messages
        if not stmt:
            continue
        try:
            cursor.execute(stmt)
            executed_count += 1
        except Exception as e:
            # Skip harmless notice messages
            print(f"    [Warning] on statement: {stmt[:60]}... \n    Error: {e}")

    print(f"    [OK] Executed {executed_count} statements.")

def main():
    args = parse_args()
    db_folder = os.path.join(os.path.dirname(__file__), "database")
    
    print("=" * 60)
    print(" DBMS Learn & Run - MySQL Database Initializer")
    print("=" * 60)
    print(f" Connecting to MySQL at {args.host}:{args.port} as '{args.user}'...")

    try:
        conn = pymysql.connect(
            host=args.host,
            port=args.port,
            user=args.user,
            password=args.password,
            charset="utf8mb4",
            autocommit=True
        )
    except pymysql.MySQLError as err:
        print("\n [ERROR] Could not connect to MySQL server:")
        print(f"  {err}")
        print("\n Tips to resolve:")
        print("  1. Verify MySQL service is running (e.g. 'Get-Service MySQL80' in PowerShell).")
        print("  2. Check your password in .env or pass it via: python init_db.py --password YOUR_PASS")
        sys.exit(1)

    print(" [OK] Successfully connected to MySQL server!")

    sql_files = [
        "01_create_database.sql",
        "02_create_tables.sql",
        "03_insert_sample_data.sql",
        "04_views.sql",
        "05_triggers.sql",
        "07_practice_table.sql",
        "08_stored_procedures.sql",
        "09_phase5_progress.sql",
        "10_phase6_progress.sql"
    ]

    with conn.cursor() as cursor:
        for fname in sql_files:
            fpath = os.path.join(db_folder, fname)
            if os.path.exists(fpath):
                execute_sql_file(cursor, fpath)
            else:
                print(f" [Warning] File {fname} not found in {db_folder}")

    # Verify tables
    try:
        conn.select_db("dbms_learn_run")
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES;")
            tables = [row[0] for row in cursor.fetchall()]
            print("\n Verification of Tables in 'dbms_learn_run':")
            print("-" * 45)
            for t in tables:
                cursor.execute(f"SELECT COUNT(*) FROM `{t}`;")
                cnt = cursor.fetchone()[0]
                print(f"  * {t:<25} : {cnt:>4} rows")
            print("-" * 45)
            print(f" Total objects created: {len(tables)} tables/views.")
    except Exception as e:
        print(f" Verification note: {e}")

    conn.close()
    print("\n [SUCCESS] Database initialization completed successfully!")
    print(" You can now start the application with: python app.py")

if __name__ == "__main__":
    main()
