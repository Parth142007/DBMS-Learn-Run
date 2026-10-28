"""
DBMS Learn & Run: Interactive Educational MySQL Platform
Flask Web Application & REST API Endpoints
"""

import os
from flask import Flask, render_template, request, jsonify, abort
from config import Config
import db
from services import gemini_service


app = Flask(__name__)
app.config.from_object(Config)

@app.before_request
def guard_cloud_endpoints():
    """
    On Vercel cloud deployment, isolate the application by excluding
    the local Practical Lab and protecting serverless instances from
    unrestricted connection manipulation.
    """
    if getattr(Config, "IS_VERCEL", False):
        if request.path == "/practical-lab" or request.path.startswith("/practical-lab/"):
            abort(404)
        if request.path.startswith("/api/practical-lab"):
            return jsonify({
                "success": False,
                "error": "Practical Lab endpoints are disabled in cloud deployment. This feature is available exclusively in local development."
            }), 404

@app.context_processor
def inject_common_context():
    """Inject database connection status and config into all templates."""
    db_status = db.test_connection()
    return {
        "db_status": db_status,
        "config": Config,
        "is_vercel": getattr(Config, "IS_VERCEL", False)
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

@app.route("/phase-2")
@app.route("/module-1")
def phase_2():
    """
    Phase 2: Introduction to DBMS
    Interactive module covering Architecture, Data Models, 
    Three-Schema Architecture, and Data Independence.
    """
    topic = request.args.get("topic", "architecture")
    valid_topics = ["architecture", "data-models", "three-schema", "data-independence"]
    if topic not in valid_topics:
        topic = "architecture"
    return render_template("phase2.html", active_page="phase2", current_topic=topic)

@app.route("/phase-3")
@app.route("/sql-lab")
def phase_3():
    """
    Phase 3: SQL & Relational Queries
    Comprehensive interactive module covering DDL, DML, DQL,
    INNER/LEFT/RIGHT/SELF/CROSS JOINs, Aggregate functions, and Nested Subqueries.
    """
    topic = request.args.get("topic", "ddl")
    valid_topics = [
        "ddl", "dml", "dql", "inner-join", "left-join",
        "right-join", "self-join", "cross-join", "aggregates", "subqueries"
    ]
    if topic not in valid_topics:
        topic = "ddl"
    return render_template("phase3.html", active_page="phase3", current_topic=topic)

@app.route("/phase-4")
@app.route("/views-triggers")
def phase_4():
    """
    Phase 4: Views, Triggers & Security
    Comprehensive interactive module covering Views & Updatable Views,
    BEFORE & AFTER Triggers, Database Constraints, Stored Procedures,
    and Authorization & Security.
    """
    topic = request.args.get("topic", "views")
    valid_topics = ["views", "triggers", "constraints", "procedures", "security"]
    if topic not in valid_topics:
        topic = "views"
    return render_template("phase4.html", active_page="phase4", current_topic=topic)

@app.route("/phase-5")
@app.route("/normalization")
def phase_5():
    """
    Phase 5: Database Design & Normalization
    Comprehensive interactive module covering Functional Dependencies,
    Armstrong's Axioms, 1NF, 2NF, 3NF, BCNF, Lossless Decomposition,
    Dependency Preservation, and Normalization Practice Lab.
    """
    topic = request.args.get("topic", "intro")
    valid_topics = [
        "intro", "fds", "axioms", "1nf", "2nf",
        "3nf", "bcnf", "comparison", "lossless", "practice-lab"
    ]
    if topic not in valid_topics:
        topic = "intro"
    return render_template("phase5.html", active_page="phase5", current_topic=topic)

@app.route("/phase-6")
@app.route("/er-model")
@app.route("/er-builder")
def phase_6():
    """
    Phase 6: ER & Relational Model
    Interactive comprehensive module covering ER Modeling, Attributes & Keys,
    Relationships & Degree, Cardinality, Participation Constraints, Weak Entities,
    Extended ER (EER), ER-to-Relational Mapping, Relational Model Fundamentals,
    and Relational Algebra (with Interactive ER Diagram Builder and Safe Relational Algebra Lab).
    """
    default_topic = "topic10" if request.path == "/er-builder" else "topic1"
    topic = request.args.get("topic", default_topic).strip().lower()
    valid_topics = [
        "topic1", "topic2", "topic3", "topic4", "topic5",
        "topic6", "topic7", "topic8", "topic9", "topic10",
        "er-intro", "attributes-keys", "relationships", "cardinality", "participation",
        "weak-entities", "extended-er", "er-mapping", "relational-fundamentals", "relational-algebra"
    ]
    # Normalize aliases to topic1-topic10
    alias_map = {
        "er-intro": "topic1",
        "attributes-keys": "topic2",
        "relationships": "topic3",
        "cardinality": "topic4",
        "participation": "topic5",
        "weak-entities": "topic6",
        "extended-er": "topic7",
        "er-mapping": "topic8",
        "relational-fundamentals": "topic9",
        "relational-algebra": "topic10"
    }
    canonical_topic = alias_map.get(topic, topic)
    if canonical_topic not in ["topic1", "topic2", "topic3", "topic4", "topic5", "topic6", "topic7", "topic8", "topic9", "topic10"]:
        canonical_topic = default_topic
    return render_template("phase6.html", active_page="phase6", current_topic=canonical_topic)

@app.route("/phase-7")
@app.route("/transactions")
@app.route("/concurrency")
@app.route("/transaction-lab")
def phase_7():
    """
    Phase 7: Transactions & Concurrency
    Comprehensive interactive module covering Transaction Concepts, ACID Properties,
    Transaction States, Concurrency Problems, Schedules & Serializability,
    Lock-Based Concurrency Control (2PL), Deadlocks & Wait-For Graphs,
    Database Recovery & WAL Logging, and SQL Isolation Levels.
    """
    default_topic = "topic10" if request.path == "/transaction-lab" else "topic1"
    topic = request.args.get("topic", default_topic).strip().lower()
    valid_topics = [
        "topic1", "topic2", "topic3", "topic4", "topic5",
        "topic6", "topic7", "topic8", "topic9", "topic10",
        "intro", "acid", "states", "concurrency", "problems",
        "serializability", "schedules", "locks", "locking",
        "deadlocks", "recovery", "wal", "isolation", "lab"
    ]
    alias_map = {
        "intro": "topic1",
        "acid": "topic2",
        "states": "topic3",
        "concurrency": "topic4",
        "problems": "topic4",
        "schedules": "topic5",
        "serializability": "topic5",
        "locks": "topic6",
        "locking": "topic6",
        "deadlocks": "topic7",
        "recovery": "topic8",
        "wal": "topic8",
        "isolation": "topic9",
        "lab": "topic10"
    }
    canonical_topic = alias_map.get(topic, topic)
    if canonical_topic not in ["topic1", "topic2", "topic3", "topic4", "topic5", "topic6", "topic7", "topic8", "topic9", "topic10"]:
        canonical_topic = default_topic
    return render_template("phase7.html", active_page="phase7", current_topic=canonical_topic)
    
@app.route("/practical-lab")
def practical_lab():
    """
    AI-Powered DBMS Practical Lab using Google Gemini 2.5 Flash.
    Provides isolated MySQL database workspaces, multi-statement SQL execution,
    and pedagogical AI assistance for college practical assignments.
    """
    return render_template("practical_lab.html", active_page="practical_lab")

# ====================================================================
# REST API ENDPOINTS
# ====================================================================

@app.route("/api/progress/phase5", methods=["GET", "POST"])
def api_phase5_progress():
    """Get or save Phase 5 learning and quiz progress."""
    if request.method == "GET":
        session_id = request.args.get("session_id", "default_student")
        res = db.get_phase5_progress(session_id)
        return jsonify(res)
    else:
        data = request.get_json() or {}
        session_id = data.get("session_id", "default_student")
        lesson_id = data.get("lesson_id", "")
        if not lesson_id:
            return jsonify({"success": False, "error": "lesson_id is required."}), 400
        score = data.get("score") if data.get("score") is not None else data.get("quiz_score", 0)
        completed = data.get("completed", True if int(score) >= 66 else False)
        quiz_max_score = int(data.get("quiz_max_score", 100))
        practice_completed = data.get("practice_completed", False)
        res = db.save_phase5_progress(session_id, f"topic_{lesson_id}" if isinstance(lesson_id, int) else str(lesson_id), completed, int(score), quiz_max_score, practice_completed)
        return jsonify(res)

@app.route("/api/normalization/verify-decomposition", methods=["POST"])
def api_verify_decomposition():
    """Mathematically verify whether a proposed relational decomposition is lossless and dependency preserving."""
    data = request.get_json() or {}
    original_attrs = data.get("attributes") or data.get("original_attributes", [])
    fds = data.get("fds") or data.get("functional_dependencies", [])
    decomposed = data.get("decomposed") or data.get("decomposed_relations", [])
    if not original_attrs or not decomposed or len(decomposed) < 2:
        return jsonify({"success": False, "error": "attributes and at least 2 decomposed relations are required."}), 400
    res = db.verify_decomposition(original_attrs, fds, decomposed)
    return jsonify({
        "success": True,
        "verification": res,
        **res
    })

@app.route("/api/progress/phase6", methods=["GET", "POST"])
def api_phase6_progress():
    """Get or save Phase 6 learning, quiz, ER diagram, and relational algebra lab progress."""
    if request.method == "GET":
        session_id = request.args.get("session_id", "default_student")
        res = db.get_phase6_progress(session_id)
        return jsonify(res)
    else:
        data = request.get_json() or {}
        session_id = data.get("session_id", "default_student")
        lesson_id = data.get("lesson_id", "")
        if not lesson_id:
            return jsonify({"success": False, "error": "lesson_id is required."}), 400
        score = data.get("score") if data.get("score") is not None else data.get("quiz_score", 0)
        quiz_max_score = int(data.get("quiz_max_score", 5))
        completed = data.get("completed", True if int(score) >= 3 else False)
        practice_completed = data.get("practice_completed", False)
        diagram_saved = data.get("diagram_saved", False)
        algebra_lab_completed = data.get("algebra_lab_completed", False)

        canonical_id = f"topic_{lesson_id}" if isinstance(lesson_id, int) else str(lesson_id)
        res = db.save_phase6_progress(
            session_id=session_id,
            lesson_id=canonical_id,
            completed=completed,
            quiz_score=int(score),
            quiz_max_score=quiz_max_score,
            practice_completed=practice_completed,
            diagram_saved=diagram_saved,
            algebra_lab_completed=algebra_lab_completed
        )
        return jsonify(res)

@app.route("/api/relational-algebra/eval", methods=["POST"])
def api_relational_algebra_eval():
    """Safely evaluate Relational Algebra operations against educational datasets."""
    data = request.get_json() or {}
    operator = data.get("operator", "").strip()
    relation1 = data.get("relation1") or data.get("r1") or "STUDENT"
    relation2 = data.get("relation2") or data.get("r2")
    attributes = data.get("attributes")
    condition = data.get("condition")
    rename_map = data.get("rename_map")

    if not operator:
        return jsonify({"success": False, "error": "operator is required (e.g. 'select', 'project', 'union', 'natural_join')."}), 400

    result = db.evaluate_relational_algebra(
        operator=operator,
        relation1=relation1,
        relation2=relation2,
        attributes=attributes,
        condition=condition,
        rename_map=rename_map
    )
    status_code = 200 if result.get("success", False) else 400
    return jsonify(result), status_code

@app.route("/api/relational-algebra/datasets", methods=["GET"])
def api_relational_algebra_datasets():
    """Retrieve educational sample datasets for Relational Algebra."""
    return jsonify({
        "success": True,
        "datasets": db.RELATIONAL_ALGEBRA_DATASETS
    })

@app.route("/api/progress/phase7", methods=["GET", "POST"])
def api_phase7_progress():
    """Get or save Phase 7 learning, quiz, and simulation progress."""
    if request.method == "GET":
        session_id = request.args.get("session_id", "default_student")
        res = db.get_phase7_progress(session_id)
        return jsonify(res)
    else:
        data = request.get_json() or {}
        session_id = data.get("session_id", "default_student")
        lesson_id = data.get("lesson_id", "")
        if not lesson_id:
            return jsonify({"success": False, "error": "lesson_id is required."}), 400
        score = data.get("score") if data.get("score") is not None else data.get("quiz_score", 0)
        quiz_max_score = int(data.get("quiz_max_score", 5))
        completed = data.get("completed", True if int(score) >= 3 else False)
        sim_bank = data.get("sim_bank_completed", False)
        sim_schedule = data.get("sim_schedule_completed", False)
        sim_lock = data.get("sim_lock_completed", False)
        sim_deadlock = data.get("sim_deadlock_completed", False)
        sim_recovery = data.get("sim_recovery_completed", False)

        canonical_id = f"topic_{lesson_id}" if isinstance(lesson_id, int) else str(lesson_id)
        res = db.save_phase7_progress(
            session_id=session_id,
            lesson_id=canonical_id,
            completed=completed,
            quiz_score=int(score),
            quiz_max_score=quiz_max_score,
            sim_bank_completed=sim_bank,
            sim_schedule_completed=sim_schedule,
            sim_lock_completed=sim_lock,
            sim_deadlock_completed=sim_deadlock,
            sim_recovery_completed=sim_recovery
        )
        return jsonify(res)

@app.route("/api/transactions/analyze-schedule", methods=["POST"])
def api_analyze_schedule():
    """Analyze transaction schedule for conflicts, build precedence graph, and verify conflict serializability."""
    data = request.get_json() or {}
    schedule_input = data.get("schedule") or data.get("operations")
    if not schedule_input:
        return jsonify({"success": False, "error": "schedule or operations string/list is required."}), 400
    res = db.analyze_transaction_schedule(schedule_input)
    status_code = 200 if res.get("success", False) else 400
    return jsonify(res), status_code

@app.route("/api/transactions/simulate-recovery", methods=["POST"])
def api_simulate_recovery():
    """Simulate Write-Ahead Logging (WAL) recovery on transaction log sequences."""
    data = request.get_json() or {}
    logs = data.get("logs") or data.get("log_records")
    crash_lsn = data.get("crash_lsn")
    initial_values = data.get("initial_values")
    res = db.simulate_wal_recovery(logs, crash_lsn, initial_values)
    return jsonify(res)



@app.route("/api/health", methods=["GET"])
def api_health():
    """Health check endpoint reporting Flask status and MySQL connectivity."""
    status = db.test_connection()
    is_healthy = status.get("connected") and status.get("database_exists")
    return jsonify({
        "status": "healthy" if is_healthy else ("degraded" if status.get("connected") else "disconnected"),
        "database_connected": status.get("connected", False),
        "database_exists": status.get("database_exists", False),
        "mysql_version": status.get("mysql_version", "Unknown"),
        "table_count": status.get("table_count", 0),
        "database": status.get("database", Config.MYSQL_DATABASE),
        "host": status.get("host", Config.MYSQL_HOST),
        "port": status.get("port", Config.MYSQL_PORT),
        "user": status.get("user", Config.MYSQL_USER),
        "error": status.get("error")
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

@app.route("/api/reset-practice-table", methods=["POST"])
@app.route("/api/reset-practice", methods=["POST"])
def api_reset_practice_table():
    """Reset the dedicated practice_students table with clean sample rows."""
    res = db.reset_practice_table()
    return jsonify(res)

@app.route("/api/query", methods=["POST"])
def api_query():
    """
    Execute user-submitted SQL statement against the practice database.
    Applies security restrictions and returns structured JSON output.
    """
    data = request.get_json() or {}
    sql_text = data.get("query", "").strip()
    confirm_unfiltered = data.get("confirm_unfiltered", False)

    if not sql_text:
        return jsonify({
            "success": False,
            "error": "Query cannot be empty.",
            "columns": [],
            "rows": [],
            "execution_time_ms": 0
        }), 400

    result = db.execute_query(sql_text, confirm_unfiltered=confirm_unfiltered)
    return jsonify(result)

@app.route("/api/test-connection", methods=["POST"])
def api_test_connection():
    """
    Test MySQL connection credentials dynamically without altering active configuration.
    Performs real PyMySQL connection and executes SELECT VERSION().
    """
    data = request.get_json(silent=True) or {}
    if getattr(Config, "IS_VERCEL", False):
        # On Vercel, lock candidate host/port/user/password to server-configured environment variables to prevent SSRF
        host = Config.MYSQL_HOST
        port = Config.MYSQL_PORT
        user = Config.MYSQL_USER
        password = Config.MYSQL_PASSWORD
        database = (data.get("database") or "").strip() or Config.MYSQL_DATABASE
    else:
        user = (data.get("user") or "").strip() or Config.MYSQL_USER
        host = (data.get("host") or "").strip() or Config.MYSQL_HOST
        database = (data.get("database") or "").strip() or Config.MYSQL_DATABASE
        port_val = data.get("port", Config.MYSQL_PORT)

        try:
            port = int(port_val)
            if not (1 <= port <= 65535):
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "connected": False,
                "database_exists": False,
                "mysql_version": "Unknown",
                "database": database,
                "host": host,
                "port": port_val,
                "user": user,
                "table_count": 0,
                "tables": [],
                "error": "Port must be a valid integer between 1 and 65535."
            }), 400

        password = data.get("password")
        # If password was omitted or empty, and targeting active host/user, fallback to active password
        if password is None or password == "" or password == "Keep active password":
            if host == Config.MYSQL_HOST and user == Config.MYSQL_USER:
                password = Config.MYSQL_PASSWORD

    res = db.test_connection(password=password, user=user, host=host, port=port, database=database)
    # Ensure no secrets leak in API response
    return jsonify({
        "connected": res.get("connected", False),
        "database_exists": res.get("database_exists", False),
        "mysql_version": res.get("mysql_version", "Unknown"),
        "database": res.get("database"),
        "host": res.get("host"),
        "port": res.get("port"),
        "user": res.get("user"),
        "table_count": res.get("table_count", 0),
        "tables": res.get("tables", []),
        "error": res.get("error")
    })

@app.route("/api/apply-connection", methods=["POST"])
def api_apply_connection():
    """
    Explicitly validate and apply new database connection settings.
    Requires successful verification before switching active runtime config.
    """
    if getattr(Config, "IS_VERCEL", False):
        return jsonify({
            "success": False,
            "error": "Applying runtime connection changes is disabled in cloud deployment. Use Vercel Environment Variables to manage database configuration."
        }), 403
    data = request.get_json() or {}
    user = (data.get("user") or "").strip() or Config.MYSQL_USER
    host = (data.get("host") or "").strip() or Config.MYSQL_HOST
    database = (data.get("database") or "").strip() or Config.MYSQL_DATABASE
    port_val = data.get("port", Config.MYSQL_PORT)

    try:
        port = int(port_val)
        if not (1 <= port <= 65535):
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "Port must be a valid integer between 1 and 65535."
        }), 400

    password = data.get("password")
    if password is None or password == "" or password == "Keep active password":
        if host == Config.MYSQL_HOST and user == Config.MYSQL_USER:
            password = Config.MYSQL_PASSWORD
        else:
            password = ""

    # 1. Verify credentials against MySQL server before switching
    test_res = db.test_connection(password=password, user=user, host=host, port=port, database=database)
    if not test_res.get("connected"):
        return jsonify({
            "success": False,
            "error": f"Cannot apply settings: Connection failed ({test_res.get('error')})"
        }), 400

    if not test_res.get("database_exists"):
        return jsonify({
            "success": False,
            "error": f"Cannot apply settings: Connected to MySQL server, but database '{database}' was not found. Please verify the schema name or run init_db.py."
        }), 400

    # 2. Update active configuration safely
    db.update_active_config(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        persist=True
    )

    return jsonify({
        "success": True,
        "message": f"Successfully connected to MySQL {test_res.get('mysql_version')} and applied '{database}' as the active database.",
        "status": {
            "host": host,
            "port": port,
            "user": user,
            "database": database,
            "mysql_version": test_res.get("mysql_version"),
            "table_count": test_res.get("table_count")
        }
    })

@app.route("/api/connection/databases", methods=["GET", "POST"])
def api_connection_databases():
    """List databases available on the connected MySQL server."""
    if getattr(Config, "IS_VERCEL", False):
        host = Config.MYSQL_HOST
        port = Config.MYSQL_PORT
        user = Config.MYSQL_USER
        password = Config.MYSQL_PASSWORD
    else:
        data = request.get_json(silent=True) or {}
        host = (data.get("host") or "").strip() or Config.MYSQL_HOST
        try:
            port = int(data.get("port") or Config.MYSQL_PORT)
        except (ValueError, TypeError):
            port = Config.MYSQL_PORT
        user = (data.get("user") or "").strip() or Config.MYSQL_USER
        password = data.get("password")
        if password is None or password == "" or password == "Keep active password":
            if host == Config.MYSQL_HOST and user == Config.MYSQL_USER:
                password = Config.MYSQL_PASSWORD
            else:
                password = ""
    res = db.list_server_databases(host=host, port=port, user=user, password=password)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/connection/revert", methods=["POST"])
def api_connection_revert():
    """Revert active database connection settings back to .env configuration."""
    if getattr(Config, "IS_VERCEL", False):
        return jsonify({
            "success": False,
            "error": "Connection revert is disabled in cloud deployment."
        }), 403
    cfg = db.revert_to_default_config()
    test_res = db.test_connection()
    return jsonify({
        "success": True,
        "message": "Connection reverted to default .env configuration.",
        "config": cfg,
        "status": test_res
    })

@app.route("/api/procedure/call", methods=["POST"])
def api_call_procedure():
    """Execute a whitelisted stored procedure with safe parameterized inputs."""
    data = request.get_json() or {}
    proc_name = data.get("procedure_name", "").strip()
    params = data.get("params", {})
    if not proc_name:
        return jsonify({"success": False, "error": "Procedure name is required."}), 400
    res = db.call_stored_procedure(proc_name, params)
    status_code = 200 if res.get("success", False) else 400
    return jsonify(res), status_code

@app.route("/api/view/inspect", methods=["POST"])
def api_inspect_view():
    """Inspect a database view: definition, updatability, and sample rows."""
    data = request.get_json() or {}
    view_name = data.get("view_name", "").strip()
    if not view_name:
        return jsonify({"success": False, "error": "View name is required."}), 400
    res = db.get_view_inspection(view_name)
    status_code = 200 if res.get("success", False) else 400
    return jsonify(res), status_code

@app.route("/api/constraint/test", methods=["POST"])
def api_test_constraint():
    """Test a database constraint violation scenario."""
    data = request.get_json() or {}
    scenario = data.get("scenario", "").strip()
    if not scenario:
        return jsonify({"success": False, "error": "Constraint scenario key is required."}), 400
    res = db.test_constraint_scenario(scenario)
    status_code = 200 if res.get("success", False) else 400
    return jsonify(res), status_code

@app.route("/api/trigger/test", methods=["POST"])
def api_test_trigger():
    """Test trigger execution behavior (BEFORE capacity check or AFTER audit logging)."""
    data = request.get_json() or {}
    action = data.get("action", "").strip()
    if not action:
        return jsonify({"success": False, "error": "Trigger action is required."}), 400
    res = db.test_trigger_scenario(action)
    status_code = 200 if res.get("success", False) else 400
    return jsonify(res), status_code

# ====================================================================
# PRACTICAL LAB & GEMINI 2.5 FLASH REST API ENDPOINTS
# ====================================================================

@app.route("/api/practical-lab/workspaces", methods=["GET"])
def api_practical_workspaces():
    """List available practical database workspaces."""
    res = db.list_practice_workspaces()
    active_cfg = db.get_active_config()
    return jsonify({
        "success": True,
        "workspaces": res.get("workspaces", []),
        "active_database": active_cfg.get("database"),
        "default_workspace": "college_practical"
    })

@app.route("/api/practical-lab/workspaces/create", methods=["POST"])
def api_practical_create_workspace():
    """Create a new isolated database workspace."""
    data = request.get_json() or {}
    name = data.get("workspace_name", "").strip()
    if not name:
        return jsonify({"success": False, "error": "Workspace name cannot be empty."}), 400
    res = db.create_practice_workspace(name)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/practical-lab/workspaces/reset", methods=["POST"])
def api_practical_reset_workspace():
    """Reset (drop and recreate) a practice database workspace with explicit confirmation."""
    data = request.get_json() or {}
    name = data.get("workspace_name", "").strip()
    confirm = data.get("confirm", False)
    if not confirm:
        return jsonify({"success": False, "error": "Explicit confirmation (confirm=True) is required to reset a database."}), 400
    res = db.reset_practice_workspace(name)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/practical-lab/workspaces/<workspace_name>/tables", methods=["GET"])
def api_practical_tables(workspace_name):
    """List tables and views in a specific workspace."""
    res = db.get_workspace_tables(workspace_name)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/practical-lab/workspaces/<workspace_name>/tables/<table_name>/schema", methods=["GET"])
def api_practical_table_schema(workspace_name, table_name):
    """Inspect columns, constraints, and sample data for a table in a workspace."""
    res = db.get_workspace_table_schema(workspace_name, table_name)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/practical-lab/execute", methods=["POST"])
def api_practical_execute():
    """Execute student SQL script in an isolated database workspace."""
    data = request.get_json() or {}
    workspace = data.get("workspace_name", "college_practical").strip()
    sql_script = data.get("sql_script", "").strip()
    if not sql_script:
        return jsonify({"success": False, "error": "SQL script cannot be empty."}), 400
    res = db.execute_practical_sql(workspace, sql_script)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/practical-lab/practicals", methods=["GET"])
def api_practical_list():
    """List saved practical lab records."""
    search = request.args.get("search", "")
    res = db.list_practical_records(search=search)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/practical-lab/practicals/<int:record_id>", methods=["GET"])
def api_practical_get(record_id):
    """Retrieve details of a saved practical."""
    res = db.get_practical_record(record_id)
    status_code = 200 if res.get("success") else 404
    return jsonify(res), status_code

@app.route("/api/practical-lab/practicals/save", methods=["POST"])
def api_practical_save():
    """Save or update a practical lab record without password."""
    data = request.get_json() or {}
    res = db.save_practical_record(
        practical_name=data.get("practical_name", ""),
        task_description=data.get("task_description", ""),
        practical_number=data.get("practical_number", ""),
        topic=data.get("topic", ""),
        workspace_name=data.get("workspace_name", "college_practical"),
        sql_script=data.get("sql_script", ""),
        record_id=data.get("id")
    )
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/practical-lab/practicals/<int:record_id>", methods=["DELETE"])
def api_practical_delete(record_id):
    """Delete a saved practical record."""
    res = db.delete_practical_record(record_id)
    status_code = 200 if res.get("success") else 400
    return jsonify(res), status_code

@app.route("/api/practical-lab/ai/status", methods=["GET"])
def api_practical_ai_status():
    """Check whether AI assistance (Gemini or OpenRouter) is configured and available."""
    custom_key = request.headers.get("X-AI-Key")
    configured = gemini_service.is_gemini_configured(custom_key=custom_key)
    return jsonify({
        "success": True,
        "configured": configured,
        "model": Config.GEMINI_MODEL or "gemini-2.5-flash",
        "supported_models": gemini_service.SUPPORTED_MODELS
    })

@app.route("/api/practical-lab/ai/models", methods=["GET"])
def api_practical_ai_models():
    """List supported AI providers and models for Bring-Your-Own-Key."""
    return jsonify({
        "success": True,
        "models": gemini_service.SUPPORTED_MODELS,
        "default_gemini_model": Config.GEMINI_MODEL or "gemini-2.5-flash",
        "default_openrouter_model": "google/gemini-2.5-flash"
    })

@app.route("/api/practical-lab/ai/test-key", methods=["POST"])
def api_practical_ai_test_key():
    """
    Validate a user-supplied API key and model against the chosen provider (Gemini or OpenRouter).
    Never logs or persists the key.
    """
    data = request.get_json(silent=True) or {}
    key = request.headers.get("X-AI-Key") or data.get("api_key", "").strip()
    provider = request.headers.get("X-AI-Provider") or data.get("provider", "gemini").strip()
    model = request.headers.get("X-AI-Model") or data.get("model", "").strip()

    if not key:
        return jsonify({
            "success": False,
            "error": "API key cannot be empty. Please provide your Gemini or OpenRouter key."
        }), 400

    success, msg, details = gemini_service.test_ai_key(provider=provider, api_key=key, model_id=model)
    status_code = 200 if success else 400
    return jsonify({
        "success": success,
        "message": msg,
        "provider": provider,
        "model": details.get("model", model),
        "error": None if success else msg
    }), status_code

@app.route("/api/practical-lab/ai/analyze", methods=["POST"])
def api_practical_ai_analyze():
    """
    Handle educational AI features with Gemini or OpenRouter:
    - check: Check My SQL against task and schema
    - explain: Plain-English pedagogical walkthrough of the program
    - errors: Pinpoint compilation, execution, or logical errors
    - suggest: Suggest corrected SQL (never auto-executed)
    - generate: Generate SQL solution for natural language task
    - explain_output: Interpret query result rows and columns
    - optimize: Suggest query optimizations & index opportunities
    - explain_schema: Educational breakdown of workspace tables
    - practice: Generate customized practice assignments
    """
    data = request.get_json() or {}
    action = data.get("action", "").strip()
    if not action:
        return jsonify({"success": False, "error": "AI action parameter is required."}), 400

    # Extract user-supplied BYO-AI credentials from secure request headers or payload
    custom_key = request.headers.get("X-AI-Key") or data.get("ai_key") or data.get("custom_key")
    custom_provider = request.headers.get("X-AI-Provider") or data.get("ai_provider") or data.get("custom_provider")
    custom_model = request.headers.get("X-AI-Model") or data.get("ai_model") or data.get("custom_model")

    data_dict, err = gemini_service.analyze_sql_with_gemini(
        action=action,
        practical_name=data.get("practical_name", ""),
        task_description=data.get("task_description", ""),
        sql=data.get("sql_code", ""),
        schema_context=data.get("schema_context", ""),
        execution_result=data.get("execution_result"),
        execution_error=data.get("execution_error", ""),
        workspace_name=data.get("workspace_name", ""),
        custom_key=custom_key,
        custom_provider=custom_provider,
        custom_model=custom_model
    )

    if err:
        return jsonify({
            "success": False,
            "error": err,
            "is_gemini_configured": gemini_service.is_gemini_configured(custom_key=custom_key)
        }), 400

    active_model = custom_model or Config.GEMINI_MODEL or "gemini-2.5-flash"
    return jsonify({
        "success": True,
        "action": action,
        "model": active_model,
        "provider": custom_provider or ("openrouter" if (custom_key and custom_key.startswith(("sk-or-", "sk-"))) else "gemini"),
        "data": data_dict
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "yes")
    print(f" * Starting DBMS Learn & Run on http://localhost:{port} (debug={debug_mode})")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)


