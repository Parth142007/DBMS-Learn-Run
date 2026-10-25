"""
DBMS Learn & Run: Secure Local MySQL Connector Service
Runs locally on student machine (bound to 127.0.0.1 loopback only).
Enables secure local MySQL execution from both local development and
cloud-hosted Vercel deployments without transmitting passwords to cloud.
"""

import sys
import os
import json
import time
import secrets
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from decimal import Decimal
from datetime import datetime, date
import pymysql
from pymysql.cursors import DictCursor

# Ensure project root is accessible
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from config import Config
except ImportError:
    class Config:
        MYSQL_HOST = "localhost"
        MYSQL_PORT = 3306
        MYSQL_USER = "root"
        MYSQL_PASSWORD = ""
        MYSQL_DATABASE = "college_practical"
        QUERY_TIMEOUT_SECONDS = 10
        MAX_ROWS_RETURNED = 200

# Security constants
PROTECTED_DATABASES = {"mysql", "information_schema", "performance_schema", "sys"}
RESTRICTED_KEYWORDS = [
    "SHUTDOWN", "DROP DATABASE", "ALTER USER", "CREATE USER",
    "GRANT ALL", "FLUSH PRIVILEGES", "LOAD DATA INFILE"
]

def serialize_val(val):
    """Serialize MySQL types into JSON-compatible values."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val) if val % 1 != 0 else int(val)
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val

class LocalConnectorState:
    """Manages local MySQL configuration and active pairing token."""
    def __init__(self):
        self.host = os.getenv("MYSQL_HOST", "localhost")
        self.port = int(os.getenv("MYSQL_PORT", 3306))
        self.user = os.getenv("MYSQL_USER", "root")
        self.password = os.getenv("MYSQL_PASSWORD", "")
        self.default_db = "college_practical"
        # Generate 32-character cryptographically random pairing token
        self.token = secrets.token_hex(16)
        self.allowed_origins = {
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://dbms-learn-run.vercel.app"
        }

    def get_connection(self, database=None):
        """Establish direct PyMySQL connection to local MySQL instance."""
        target_db = database or self.default_db
        return pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=target_db,
            charset="utf8mb4",
            cursorclass=DictCursor,
            connect_timeout=Config.QUERY_TIMEOUT_SECONDS,
            autocommit=True
        )

    def test_connection(self):
        """Test local MySQL connectivity."""
        try:
            conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                charset="utf8mb4",
                cursorclass=DictCursor,
                connect_timeout=3,
                autocommit=True
            )
            with conn.cursor() as cursor:
                cursor.execute("SELECT VERSION() AS ver;")
                row = cursor.fetchone()
                ver = row.get("ver", "8.0") if row else "8.0"
            conn.close()
            return {"connected": True, "version": ver, "host": f"{self.host}:{self.port}", "user": self.user}
        except Exception as e:
            err_msg = str(e)
            if self.password:
                err_msg = err_msg.replace(self.password, "******")
            err_msg = re.sub(r"using password:\s*[^\s\)]+", "using password: ***", err_msg, flags=re.IGNORECASE)
            return {"connected": False, "error": err_msg, "host": f"{self.host}:{self.port}", "user": self.user}

state = LocalConnectorState()

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle multiple concurrent HTTP requests safely."""
    daemon_threads = True

class ConnectorRequestHandler(BaseHTTPRequestHandler):
    """Request handler enforcing token authentication, loopback host, and CORS protections."""

    def _send_cors_headers(self):
        """Send CORS and W3C Private Network Access headers."""
        origin = self.headers.get("Origin", "")
        # Allow approved origins or loopback callers
        if origin in state.allowed_origins or "vercel.app" in origin or "localhost" in origin or "127.0.0.1" in origin:
            self.send_header("Access-Control-Allow-Origin", origin)
        else:
            self.send_header("Access-Control-Allow-Origin", "*")

        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Connector-Token, X-Requested-With")
        self.send_header("Access-Control-Allow-Credentials", "true")
        # Critical W3C Private Network Access header for modern browser security
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _send_json(self, status_code, data):
        """Send JSON response with secure headers."""
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """Handle CORS and Private Network Access preflights."""
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _check_host(self):
        """Prevent DNS rebinding by verifying Host header."""
        host = self.headers.get("Host", "").split(":")[0].lower()
        if host not in ("127.0.0.1", "localhost"):
            self._send_json(403, {"success": False, "error": "Access Forbidden: Host header mismatch."})
            return False
        return True

    def _check_token(self):
        """Verify the cryptographically random pairing token."""
        token = self.headers.get("X-Connector-Token")
        if not token or token.strip() != state.token:
            self._send_json(401, {
                "success": False,
                "error": "Unauthorized: Missing or invalid X-Connector-Token pairing token.",
                "hint": "Check the token generated in your local connector terminal."
            })
            return False
        return True

    def do_GET(self):
        """Handle GET endpoints."""
        if not self._check_host():
            return

        path = self.path.split("?")[0]

        # 1. Root Companion UI
        if path == "/" or path == "/index.html":
            self._serve_companion_ui()
            return

        # 2. Public health / info endpoint (no secret revealed)
        if path == "/api/info":
            status = state.test_connection()
            self._send_json(200, {
                "success": True,
                "service": "DBMS Learn & Run Local Connector",
                "version": "1.0.0",
                "loopback": True,
                "mysql": status,
                "token_required": True
            })
            return

        # Token-protected GET endpoints
        if not self._check_token():
            return

        if path in ("/api/status", "/api/health"):
            status = state.test_connection()
            self._send_json(200, {
                "success": True,
                "status": "ok" if status.get("connected") else "error",
                "connected": status.get("connected"),
                "version": status.get("version", "8.0"),
                "host": state.host,
                "port": state.port,
                "active_database": state.default_db
            })
            return

        if path == "/api/workspaces":
            self._handle_list_workspaces()
            return

        if path.startswith("/api/tables"):
            self._handle_list_tables()
            return

        self._send_json(404, {"success": False, "error": "Endpoint not found."})

    def do_POST(self):
        """Handle POST endpoints."""
        if not self._check_host():
            return

        path = self.path.split("?")[0]

        # 1. Pairing verification endpoint
        if path == "/api/pair":
            data = self._read_json_body()
            token = data.get("token", "").strip() if data else ""
            if token == state.token:
                status = state.test_connection()
                self._send_json(200, {
                    "success": True,
                    "message": "Successfully paired with local MySQL connector!",
                    "mysql": status,
                    "default_workspace": state.default_db
                })
            else:
                self._send_json(401, {
                    "success": False,
                    "error": "Invalid pairing token. Please copy the exact token from your terminal."
                })
            return

        # All subsequent POST endpoints require token
        if not self._check_token():
            return

        if path == "/api/execute":
            self._handle_execute()
            return

        if path == "/api/workspaces/create":
            self._handle_create_workspace()
            return

        if path == "/api/workspaces/reset":
            self._handle_reset_workspace()
            return

        self._send_json(404, {"success": False, "error": "Endpoint not found."})

    def _read_json_body(self):
        """Read and parse JSON request payload."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 1024 * 1024:  # 1MB limit
            return None
        body = self.rfile.read(content_length)
        try:
            return json.loads(body.decode("utf-8"))
        except Exception:
            return {}

    def _handle_list_workspaces(self):
        """List local practice database workspaces."""
        try:
            conn = pymysql.connect(
                host=state.host, port=state.port, user=state.user, password=state.password,
                charset="utf8mb4", cursorclass=DictCursor, autocommit=True
            )
            with conn.cursor() as cursor:
                cursor.execute("SHOW DATABASES;")
                rows = cursor.fetchall()
            conn.close()

            workspaces = []
            for r in rows:
                db_name = list(r.values())[0]
                if db_name.lower() not in PROTECTED_DATABASES:
                    workspaces.append(db_name)

            if state.default_db not in workspaces:
                workspaces.insert(0, state.default_db)

            self._send_json(200, {"success": True, "workspaces": workspaces, "default": state.default_db})
        except Exception as e:
            self._send_json(500, {"success": False, "error": f"Failed to list databases: {str(e)}"})

    def _handle_list_tables(self):
        """List tables in requested workspace."""
        # Parse query params
        from urllib.parse import urlparse, parse_qs
        qs = parse_qs(urlparse(self.path).query)
        workspace = qs.get("workspace", [state.default_db])[0].strip()

        if workspace.lower() in PROTECTED_DATABASES:
            self._send_json(403, {"success": False, "error": "Access to system databases is blocked."})
            return

        try:
            conn = state.get_connection(workspace)
            with conn.cursor() as cursor:
                cursor.execute("SHOW FULL TABLES;")
                rows = cursor.fetchall()
                tables = []
                for r in rows:
                    vals = list(r.values())
                    tables.append({
                        "name": vals[0],
                        "type": vals[1] if len(vals) > 1 else "BASE TABLE"
                    })
            conn.close()
            self._send_json(200, {"success": True, "workspace": workspace, "tables": tables})
        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})

    def _handle_create_workspace(self):
        """Create new isolated local database."""
        data = self._read_json_body() or {}
        name = data.get("workspace_name", "").strip()
        if not re.match(r"^[a-zA-Z0-9_]{1,64}$", name):
            self._send_json(400, {"success": False, "error": "Invalid database name. Use letters, numbers, and underscores only."})
            return

        if name.lower() in PROTECTED_DATABASES:
            self._send_json(403, {"success": False, "error": "Cannot use reserved system database name."})
            return

        try:
            conn = pymysql.connect(
                host=state.host, port=state.port, user=state.user, password=state.password,
                charset="utf8mb4", cursorclass=DictCursor, autocommit=True
            )
            with conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            conn.close()
            self._send_json(200, {"success": True, "workspace": name, "message": f"Database '{name}' created successfully on local MySQL."})
        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})

    def _handle_reset_workspace(self):
        """Drop and recreate local practice database."""
        data = self._read_json_body() or {}
        name = data.get("workspace_name", "").strip()
        confirm = data.get("confirm", False)
        if not confirm:
            self._send_json(400, {"success": False, "error": "Explicit confirmation (confirm=True) required."})
            return

        if name.lower() in PROTECTED_DATABASES:
            self._send_json(403, {"success": False, "error": "System databases cannot be reset."})
            return

        try:
            conn = pymysql.connect(
                host=state.host, port=state.port, user=state.user, password=state.password,
                charset="utf8mb4", cursorclass=DictCursor, autocommit=True
            )
            with conn.cursor() as cursor:
                cursor.execute(f"DROP DATABASE IF EXISTS `{name}`;")
                cursor.execute(f"CREATE DATABASE `{name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            conn.close()
            self._send_json(200, {"success": True, "workspace": name, "message": f"Database '{name}' dropped and cleanly recreated."})
        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})

    def _handle_execute(self):
        """Safely execute multi-statement student SQL script on local MySQL."""
        data = self._read_json_body() or {}
        workspace = data.get("workspace_name", state.default_db).strip()
        sql_script = data.get("sql_script", "").strip()

        if not sql_script:
            self._send_json(400, {"success": False, "error": "SQL script cannot be empty."})
            return

        if len(sql_script) > 65536:
            self._send_json(400, {"success": False, "error": "SQL script exceeds maximum size (64 KB)."})
            return

        # Security check: system databases
        if workspace.lower() in PROTECTED_DATABASES:
            self._send_json(403, {"success": False, "error": f"Direct execution in system database '{workspace}' is blocked."})
            return

        # Security check: cross-database escape guard
        for protected in PROTECTED_DATABASES:
            pattern = rf"\b(from|join|into|update|table|database)\s+[`\"]?{protected}[`\"]?\."
            if re.search(pattern, sql_script, re.IGNORECASE) or re.search(rf"\buse\s+[`\"]?{protected}[`\"]?", sql_script, re.IGNORECASE):
                self._send_json(403, {"success": False, "error": f"Security Notice: Queries referencing protected database '{protected}' are blocked."})
                return

        # Security check: administrative commands
        upper_script = sql_script.upper()
        for restricted in RESTRICTED_KEYWORDS:
            if restricted in upper_script:
                self._send_json(403, {"success": False, "error": f"Security Notice: Restricted administrative command '{restricted}' is blocked."})
                return

        # Ensure database exists
        try:
            init_conn = pymysql.connect(
                host=state.host, port=state.port, user=state.user, password=state.password,
                charset="utf8mb4", cursorclass=DictCursor, autocommit=True
            )
            with init_conn.cursor() as cur:
                cur.execute(f"CREATE DATABASE IF NOT EXISTS `{workspace}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            init_conn.close()
        except Exception as e:
            self._send_json(500, {"success": False, "error": f"Failed to verify practice database: {str(e)}"})
            return

        # Split statements properly
        statements = []
        raw_stmts = re.split(r";(?=(?:[^'\"]*['\"][^'\"]*['\"])*[^'\"]*$)", sql_script)
        for s in raw_stmts:
            s_clean = s.strip()
            # Remove comment lines
            lines = [l for l in s_clean.splitlines() if not l.strip().startswith(("--", "#"))]
            cleaned = "\n".join(lines).strip()
            if cleaned:
                statements.append(cleaned)

        if not statements:
            self._send_json(400, {"success": False, "error": "No executable SQL statements found in script."})
            return

        start_time = time.perf_counter()
        executed_count = 0
        total_affected = 0
        last_query_result = None
        executed_records = []
        messages = []

        conn = None
        try:
            conn = state.get_connection(workspace)
            with conn.cursor() as cursor:
                for idx, stmt in enumerate(statements):
                    try:
                        cursor.execute(stmt)
                        executed_count += 1
                        aff = cursor.rowcount if cursor.rowcount >= 0 else 0
                        total_affected += aff

                        upper_stmt = stmt.upper()
                        stmt_type = upper_stmt.split()[0] if upper_stmt.split() else "SQL"
                        is_select = upper_stmt.startswith(("SELECT", "SHOW", "DESCRIBE", "EXPLAIN"))

                        rec = {
                            "statement": stmt,
                            "type": stmt_type,
                            "status": "success",
                            "affected_rows": aff,
                            "columns": [],
                            "rows": [],
                            "row_count": 0
                        }

                        if is_select and cursor.description:
                            cols = [c[0] for c in cursor.description]
                            raw_rows = cursor.fetchmany(Config.MAX_ROWS_RETURNED)
                            rows = [{k: serialize_val(v) for k, v in r.items()} for r in raw_rows]
                            last_query_result = {
                                "columns": cols,
                                "rows": rows,
                                "row_count": len(rows)
                            }
                            rec["columns"] = cols
                            rec["rows"] = rows
                            rec["row_count"] = len(rows)
                            messages.append(f"Statement {idx + 1}: Returned {len(rows)} row(s).")
                        elif upper_stmt.startswith("CREATE"):
                            messages.append(f"Statement {idx + 1}: Object created successfully.")
                        elif upper_stmt.startswith("DROP"):
                            messages.append(f"Statement {idx + 1}: Object dropped successfully.")
                        elif upper_stmt.startswith("ALTER"):
                            messages.append(f"Statement {idx + 1}: Object altered successfully.")
                        else:
                            messages.append(f"Statement {idx + 1}: Executed ({aff} row(s) affected).")

                        executed_records.append(rec)

                    except Exception as stmt_err:
                        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                        self._send_json(400, {
                            "success": False,
                            "error": str(stmt_err),
                            "failed_statement": stmt,
                            "failed_statement_index": idx + 1,
                            "statements_executed": executed_count,
                            "total_statements": len(statements),
                            "affected_rows": total_affected,
                            "execution_time_ms": elapsed_ms,
                            "messages": messages,
                            "statements": executed_records,
                            "workspace": workspace,
                            "source": "Local MySQL Connector"
                        })
                        return

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            self._send_json(200, {
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
                "statements": executed_records,
                "workspace": workspace,
                "source": "Local MySQL Connector",
                "error": None
            })

        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            self._send_json(500, {
                "success": False,
                "error": f"Local database error: {str(e)}",
                "execution_time_ms": elapsed_ms,
                "workspace": workspace,
                "source": "Local MySQL Connector"
            })
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def _serve_companion_ui(self):
        """Serve the built-in Local Companion UI."""
        status = state.test_connection()
        conn_badge = '<span style="color:#22c55e;">● Connected</span>' if status.get("connected") else '<span style="color:#ef4444;">● Disconnected</span>'
        mysql_info = f"MySQL {status.get('version')} ({state.user}@{state.host}:{state.port})" if status.get("connected") else status.get("error", "Cannot connect to localhost:3306")

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DBMS Learn & Run — Local Connector</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #0b0f19;
            color: #f8fafc;
            margin: 0;
            padding: 2rem;
            display: flex;
            justify-content: center;
        }}
        .card {{
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 12px;
            max-width: 680px;
            width: 100%;
            padding: 2rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }}
        h1 {{
            font-size: 1.5rem;
            margin-top: 0;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}
        .badge {{
            display: inline-block;
            background: #1e293b;
            color: #94a3b8;
            font-size: 0.8rem;
            padding: 0.25rem 0.6rem;
            border-radius: 9999px;
            font-weight: 600;
        }}
        .token-box {{
            background: #0f172a;
            border: 1px solid #334155;
            padding: 1rem;
            border-radius: 8px;
            margin: 1.25rem 0;
            font-family: monospace;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 1.1rem;
            color: #22c55e;
            letter-spacing: 0.05em;
        }}
        .btn {{
            background: #0284c7;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.85rem;
        }}
        .btn:hover {{ background: #0369a1; }}
        .status-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
            font-size: 0.9rem;
        }}
        .status-table td {{
            padding: 0.5rem 0;
            border-bottom: 1px solid #1f2937;
        }}
        .status-table td:first-child {{
            color: #94a3b8;
            width: 35%;
        }}
        .alert {{
            background: #172554;
            border: 1px solid #1e40af;
            color: #bfdbfe;
            padding: 0.85rem;
            border-radius: 6px;
            font-size: 0.85rem;
            margin-top: 1.25rem;
            line-height: 1.5;
        }}
        code {{
            background: #1e293b;
            padding: 0.15rem 0.4rem;
            border-radius: 4px;
            color: #38bdf8;
            font-family: monospace;
        }}
    </style>
</head>
<body>
    <div class="card">
        <h1>
            <span>🚀</span> DBMS Learn &amp; Run
            <span class="badge">Local Connector v1.0</span>
        </h1>
        <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 1rem;">
            This lightweight service runs locally on your PC, safely connecting your browser to your local MySQL 8.0 server without exposing credentials to the cloud.
        </p>

        <div style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600; text-transform: uppercase;">
            Your Active Pairing Token:
        </div>
        <div class="token-box">
            <span id="token-val">{state.token}</span>
            <button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('token-val').innerText); this.innerText='Copied!';">Copy Token</button>
        </div>

        <table class="status-table">
            <tr>
                <td>Service Binding</td>
                <td><code>http://127.0.0.1:5005</code> (Loopback Only)</td>
            </tr>
            <tr>
                <td>Local MySQL Status</td>
                <td>{conn_badge} &mdash; {mysql_info}</td>
            </tr>
            <tr>
                <td>Security Protections</td>
                <td>Token Auth &bull; Origin Restriction &bull; Loopback &bull; PNA Enabled</td>
            </tr>
        </table>

        <div class="alert">
            <strong>💡 How to use:</strong> Open the <strong>AI Practical Lab</strong> on <a href="https://dbms-learn-run.vercel.app/practical-lab" target="_blank" style="color:#60a5fa;">DBMS Learn & Run</a>, choose <strong>Mode B: My Local MySQL</strong>, and paste your pairing token above. You're ready to run queries!
        </div>
    </div>
</body>
</html>"""
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

def start_connector(port=5005, host="127.0.0.1"):
    """Launch the threaded loopback connector service."""
    server_address = (host, port)
    httpd = ThreadedHTTPServer(server_address, ConnectorRequestHandler)

    print("=" * 64)
    print("🚀 DBMS Learn & Run — Secure Local MySQL Connector Service")
    print("=" * 64)
    print(f" Status:        ACTIVE on http://{host}:{port}")
    print(f" Pairing Token: {state.token}")
    print(f" Local MySQL:   {state.user}@{state.host}:{state.port}")
    print("=" * 64)
    print(" 📋 Instructions:")
    print(" 1. In Practical Lab, select 'Mode B: My Local MySQL'.")
    print(f" 2. Paste the Pairing Token above: {state.token}")
    print(f" 3. Or visit the Companion UI directly at: http://{host}:{port}")
    print("=" * 64)
    print(" Press Ctrl+C to stop the connector service.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n* Stopping Local Connector Service...")
        httpd.server_close()

if __name__ == "__main__":
    port_arg = 5005
    if len(sys.argv) > 1:
        try:
            port_arg = int(sys.argv[1])
        except ValueError:
            pass
    start_connector(port=port_arg)
