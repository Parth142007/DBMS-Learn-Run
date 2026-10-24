"""
DBMS Learn & Run: Interactive Educational MySQL Platform
Flask Web Application & REST API Endpoints
"""

import os
from flask import Flask, render_template, request, jsonify
from config import Config
import db

app = Flask(__name__)
app.config.from_object(Config)

@app.context_processor
def inject_common_context():
    """Inject database connection status and config into all templates."""
    db_status = db.test_connection()
    return {
        "db_status": db_status,
        "config": Config
    }

@app.route("/")
def index():
    """Main Dashboard & Interactive SQL Runner."""
    initial_query = request.args.get("query", "")
    return render_template("index.html", active_page="dashboard", initial_query=initial_query)

@app.route("/schema")
def schema():
    """Relational Schema Inspector displaying columns, constraints, and keys."""
    table_names = [
        "departments", "students", "courses", "events",
        "organizers", "registrations", "attendance", "feedback"
    ]
    schema_info = {}
    for t in table_names:
        res = db.get_table_schema(t)
        if res.get("success"):
            schema_info[t] = res

    return render_template("schema.html", active_page="schema", schema_info=schema_info)

# ====================================================================
# REST API ENDPOINTS
# ====================================================================

@app.route("/api/health", methods=["GET"])
def api_health():
    """Health check endpoint reporting Flask status and MySQL connectivity."""
    status = db.test_connection()
    return jsonify({
        "status": "healthy" if status["connected"] else "degraded",
        "database_connected": status["connected"],
        "database_exists": status["database_exists"],
        "mysql_version": status["mysql_version"],
        "table_count": status["table_count"]
    })

@app.route("/api/tables", methods=["GET"])
def api_tables():
    """Retrieve all tables and row counts in dbms_learn_run."""
    status = db.test_connection()
    return jsonify({
        "success": status["connected"],
        "tables": status["tables"],
        "error": status["error"]
    })

@app.route("/api/query", methods=["POST"])
def api_query():
    """
    Execute user-submitted SQL statement against the practice database.
    Applies security restrictions and returns structured JSON output.
    """
    data = request.get_json() or {}
    sql_text = data.get("query", "").strip()

    if not sql_text:
        return jsonify({
            "success": False,
            "error": "Query cannot be empty.",
            "columns": [],
            "rows": [],
            "execution_time_ms": 0
        }), 400

    result = db.execute_query(sql_text)
    return jsonify(result)

@app.route("/api/test-connection", methods=["POST"])
def api_test_connection():
    """Test MySQL connection credentials dynamically from the UI modal."""
    data = request.get_json() or {}
    user = data.get("user", Config.MYSQL_USER)
    password = data.get("password", Config.MYSQL_PASSWORD)
    host = data.get("host", Config.MYSQL_HOST)
    port = int(data.get("port", Config.MYSQL_PORT))

    res = db.test_connection(password=password, user=user, host=host, port=port)
    return jsonify(res)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f" * Starting DBMS Learn & Run on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
