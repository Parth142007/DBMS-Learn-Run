"""
DBMS Learn & Run: Test Suite for AI-Powered DBMS Practical Lab
Tests workspace isolation, multi-statement MySQL execution, persistent practical saving/loading,
Gemini 2.5 Flash educational advisory service, and security constraints.
"""

import unittest
import json
from unittest.mock import patch, MagicMock
from app import app
from config import Config
import db
from services import gemini_service

class TestPracticalLab(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True
        self.test_workspace = "dbms_practice_unittest"
        # Ensure clean state for test workspace if possible
        db.create_practice_workspace(self.test_workspace)

    def tearDown(self):
        # Clean up unittest workspace
        try:
            conn = db.get_connection()
            if conn:
                cursor = conn.cursor()
                cursor.execute(f"DROP DATABASE IF EXISTS `{self.test_workspace}`")
                conn.close()
        except Exception:
            pass

    # ====================================================================
    # 1. Page & Navigation Rendering Tests
    # ====================================================================
    def test_practical_lab_page_renders(self):
        """Verify /practical-lab renders complete HTML with UI controls."""
        response = self.client.get("/practical-lab")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        # Title & Badges
        self.assertIn("AI-Powered DBMS Practical Lab", html)
        self.assertIn("Gemini 2.5 Flash", html)

        # Core Form Inputs
        self.assertIn('id="practical-name"', html)
        self.assertIn('id="practical-task"', html)
        self.assertIn('id="practical-number"', html)
        self.assertIn('id="practical-topic"', html)

        # Workspace & Table Explorer
        self.assertIn('id="workspace-select"', html)
        self.assertIn('id="workspace-tables-container"', html)
        self.assertIn('id="btn-refresh-tables"', html)

        # SQL Editor & Execution
        self.assertIn('id="sql-editor"', html)
        self.assertIn('id="btn-run-sql"', html)
        self.assertIn('id="execution-output-body"', html)

        # Gemini Advisory Actions
        self.assertIn('id="btn-ai-check"', html)
        self.assertIn('id="btn-ai-explain"', html)
        self.assertIn('id="btn-ai-errors"', html)
        self.assertIn('id="btn-ai-suggest"', html)
        self.assertIn('id="btn-ai-generate"', html)

        # Sidebar navigation has AI Practical Lab link
        self.assertIn('/practical-lab', html)
        self.assertIn('AI Practical Lab', html)

    # ====================================================================
    # 2. Workspace Validation & Isolation Security
    # ====================================================================
    def test_workspace_name_validation(self):
        """Verify protected databases and invalid identifiers are rejected."""
        # Protected system databases
        for protected in ["dbms_learn_run", "mysql", "information_schema", "performance_schema", "sys"]:
            valid, err = db.validate_workspace_name(protected)
            self.assertFalse(valid, f"Database '{protected}' should be protected!")
            self.assertIn("protected", err.lower())

        # Invalid identifiers
        for invalid in ["bad-name", "with spaces", "semi;colon", "test/slash", ""]:
            valid, err = db.validate_workspace_name(invalid)
            self.assertFalse(valid, f"Identifier '{invalid}' should be rejected!")

        # Valid identifiers
        for valid_name in ["college_practical", "dbms_practice_1", "assignment_schema"]:
            valid, err = db.validate_workspace_name(valid_name)
            self.assertTrue(valid, f"Valid identifier '{valid_name}' failed validation: {err}")

    def test_cross_database_escape_blocked(self):
        """Verify student SQL cannot escape workspace to touch dbms_learn_run."""
        malicious_sqls = [
            "SELECT * FROM dbms_learn_run.students;",
            "DROP DATABASE dbms_learn_run;",
            "INSERT INTO dbms_learn_run.courses VALUES ('CS999', 'Hacked', 4);"
        ]
        for malicious_sql in malicious_sqls:
            res = db.execute_practical_sql(self.test_workspace, malicious_sql)
            self.assertFalse(res.get("success"), f"SQL '{malicious_sql}' should be blocked by isolation rule!")
            self.assertIn("security", res.get("error", "").lower())

    # ====================================================================
    # 3. Multi-Statement SQL Execution Engine
    # ====================================================================
    def test_multi_statement_execution_lifecycle(self):
        """Test DDL creation, DML insertion, and DQL selection in sequence."""
        script = """
        CREATE TABLE IF NOT EXISTS test_students (
            roll_no INT PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            branch VARCHAR(20)
        );

        INSERT INTO test_students VALUES (101, 'Aarav Patel', 'CSE');
        INSERT INTO test_students VALUES (102, 'Diya Sharma', 'ECE');

        SELECT * FROM test_students ORDER BY roll_no ASC;
        """
        res = db.execute_practical_sql(self.test_workspace, script)
        self.assertTrue(res.get("success"), f"Execution failed: {res.get('error')}")

        statements = res.get("statements", [])
        self.assertEqual(len(statements), 4)

        # Verify Statement 1: CREATE TABLE
        self.assertEqual(statements[0]["type"], "CREATE")
        self.assertEqual(statements[0]["status"], "success")

        # Verify Statements 2 & 3: INSERT
        self.assertEqual(statements[1]["type"], "INSERT")
        self.assertEqual(statements[1]["affected_rows"], 1)
        self.assertEqual(statements[2]["type"], "INSERT")
        self.assertEqual(statements[2]["affected_rows"], 1)

        # Verify Statement 4: SELECT
        self.assertEqual(statements[3]["type"], "SELECT")
        self.assertEqual(statements[3]["row_count"], 2)
        rows = statements[3]["rows"]
        self.assertEqual(rows[0]["name"], "Aarav Patel")
        self.assertEqual(rows[1]["name"], "Diya Sharma")

        # Verify Table Explorer lists test_students
        tables_res = db.get_workspace_tables(self.test_workspace)
        self.assertTrue(tables_res.get("success"))
        table_names = [t["name"] for t in tables_res.get("tables", [])]
        self.assertIn("test_students", table_names)

        # Verify Table Schema Inspector
        schema_res = db.get_workspace_table_schema(self.test_workspace, "test_students")
        self.assertTrue(schema_res.get("success"))
        cols = [c["name"] for c in schema_res.get("columns", [])]
        self.assertIn("roll_no", cols)
        self.assertIn("name", cols)
        self.assertEqual(schema_res.get("total_rows"), 2)

    def test_syntax_error_handling(self):
        """Verify syntax errors return educational MySQL errors without crashing."""
        broken_script = "SELECT * FORM nowhere; -- Typo in FORM"
        res = db.execute_practical_sql(self.test_workspace, broken_script)
        self.assertFalse(res.get("success"))
        self.assertIn("error", res)
        # Should contain MySQL 1064 syntax error
        self.assertTrue("1064" in res.get("error") or "syntax" in res.get("error").lower())

    def test_workspace_reset(self):
        """Verify resetting workspace clears tables when confirmed."""
        # Create a table first
        db.execute_practical_sql(self.test_workspace, "CREATE TABLE temp_xyz (id INT);")
        tables_before = db.get_workspace_tables(self.test_workspace)
        self.assertEqual(len(tables_before.get("tables", [])), 1)

        # Attempt reset without confirmation via API -> should fail
        res_no_confirm = self.client.post("/api/practical-lab/workspaces/reset", json={
            "workspace_name": self.test_workspace,
            "confirm": False
        })
        self.assertEqual(res_no_confirm.status_code, 400)

        # Reset with confirmation -> should succeed
        res_confirm = self.client.post("/api/practical-lab/workspaces/reset", json={
            "workspace_name": self.test_workspace,
            "confirm": True
        })
        self.assertEqual(res_confirm.status_code, 200)

        # Verify table list is now empty
        tables_after = db.get_workspace_tables(self.test_workspace)
        self.assertEqual(len(tables_after.get("tables", [])), 0)

    # ====================================================================
    # 4. Practical Record Persistence Tests (No Passwords Required)
    # ====================================================================
    def test_save_load_delete_practical(self):
        """Verify practical records save, list, load, and delete without password."""
        # 1. Save Practical
        save_payload = {
            "practical_name": "Test Lab 1: DDL Verification",
            "practical_number": "PR-01",
            "topic": "DDL Basics",
            "task_description": "Create a department table with dept_id and dept_name.",
            "workspace_name": self.test_workspace,
            "sql_script": "CREATE TABLE dept (dept_id INT PRIMARY KEY, dept_name VARCHAR(50));"
        }
        res_save = self.client.post("/api/practical-lab/practicals/save", json=save_payload)
        self.assertEqual(res_save.status_code, 200)
        data_save = res_save.get_json()
        self.assertTrue(data_save.get("success"))
        record_id = data_save.get("id")
        self.assertIsNotNone(record_id)

        # 2. List Practicals
        res_list = self.client.get("/api/practical-lab/practicals")
        self.assertEqual(res_list.status_code, 200)
        practicals = res_list.get_json().get("practicals", [])
        matching = [p for p in practicals if p["id"] == record_id]
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]["practical_name"], "Test Lab 1: DDL Verification")

        # 3. Get Single Practical
        res_get = self.client.get(f"/api/practical-lab/practicals/{record_id}")
        self.assertEqual(res_get.status_code, 200)
        record = res_get.get_json().get("practical")
        self.assertEqual(record["practical_number"], "PR-01")
        self.assertIn("CREATE TABLE dept", record["sql_script"])

        # 4. Delete Practical
        res_del = self.client.delete(f"/api/practical-lab/practicals/{record_id}")
        self.assertEqual(res_del.status_code, 200)

        # Verify Deleted
        res_get_del = self.client.get(f"/api/practical-lab/practicals/{record_id}")
        self.assertEqual(res_get_del.status_code, 404)

    # ====================================================================
    # 5. Gemini 2.5 Flash Advisory Service Tests
    # ====================================================================
    def test_ai_status_endpoint(self):
        """Verify /api/practical-lab/ai/status returns status and model."""
        res = self.client.get("/api/practical-lab/ai/status")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("configured", data)
        self.assertEqual(data.get("model"), "gemini-2.5-flash")

    def test_gemini_missing_key_graceful_message(self):
        """Verify that when API key is missing, an informative educational message is returned."""
        with patch.object(Config, 'GEMINI_API_KEY', ""):
            client, err = gemini_service.get_gemini_client()
            self.assertIsNone(client)
            self.assertIn("Gemini API key is not configured", err)
            self.assertIn("GEMINI_API_KEY", err)

    @patch("services.gemini_service.call_gemini")
    def test_gemini_actions_mocked(self, mock_call):
        """Test all 6 AI advisory features with mock Gemini 2.5 Flash response."""
        # Mock Check SQL
        mock_call.return_value = ({
            "overall_assessment": "The SQL query correctly defines the table.",
            "satisfies_task": True,
            "confirmed_errors": [],
            "potential_issues": [],
            "explanation": "Primary key properly assigned to roll_no.",
            "suggested_sql": "CREATE TABLE student (roll_no INT PRIMARY KEY);"
        }, None)

        res = self.client.post("/api/practical-lab/ai/analyze", json={
            "action": "check",
            "practical_name": "PR 1",
            "task_description": "Create student table",
            "sql_code": "CREATE TABLE student (roll_no INT PRIMARY KEY);"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("model"), "gemini-2.5-flash")
        self.assertTrue(data["data"]["satisfies_task"])

        # Test Explain Program
        mock_call.return_value = ({
            "overview": "Demonstrates relational table creation.",
            "steps": [{"step_number": 1, "statement_summary": "CREATE TABLE", "explanation": "Defines schema"}],
            "key_concepts_demonstrated": ["Data Definition Language"]
        }, None)

        res_explain = self.client.post("/api/practical-lab/ai/analyze", json={
            "action": "explain",
            "sql_code": "CREATE TABLE student (roll_no INT);"
        })
        self.assertEqual(res_explain.status_code, 200)
        self.assertIn("overview", res_explain.get_json()["data"])

        # Test Find Errors
        mock_call.return_value = ({
            "has_errors": True,
            "summary": "Syntax typo detected.",
            "errors": [{"type": "Syntax", "description": "Misspelled FROM", "fix": "Change FORM to FROM"}],
            "corrected_sql": "SELECT * FROM student;"
        }, None)

        res_errors = self.client.post("/api/practical-lab/ai/analyze", json={
            "action": "errors",
            "sql_code": "SELECT * FORM student;"
        })
        self.assertEqual(res_errors.status_code, 200)
        self.assertTrue(res_errors.get_json()["data"]["has_errors"])

        # Test Suggest Correction
        mock_call.return_value = ({
            "explanation": "Added NOT NULL constraint on student name.",
            "changes_made": ["Added NOT NULL to name column"],
            "suggested_sql": "CREATE TABLE student (roll_no INT PRIMARY KEY, name VARCHAR(50) NOT NULL);"
        }, None)

        res_suggest = self.client.post("/api/practical-lab/ai/analyze", json={
            "action": "suggest",
            "sql_code": "CREATE TABLE student (roll_no INT PRIMARY KEY, name VARCHAR(50));"
        })
        self.assertEqual(res_suggest.status_code, 200)
        self.assertIn("suggested_sql", res_suggest.get_json()["data"])

        # Test Generate SQL
        mock_call.return_value = ({
            "generated_sql": "CREATE TABLE employee (emp_id INT PRIMARY KEY);",
            "assumptions": ["Assumed emp_id is unique"],
            "explanation": "Creates employee table",
            "sample_data_included": True
        }, None)

        res_gen = self.client.post("/api/practical-lab/ai/analyze", json={
            "action": "generate",
            "task_description": "Create an employee table with ID and name"
        })
        self.assertEqual(res_gen.status_code, 200)
        self.assertIn("generated_sql", res_gen.get_json()["data"])

        # Test Explain Output
        mock_call.return_value = ({
            "is_prediction": False,
            "summary": "Query returned 2 student records.",
            "data_interpretation": "Filter branch = 'CSE' matched 2 rows.",
            "column_insights": [{"column": "roll_no", "meaning": "Primary key"}],
            "learning_takeaway": "WHERE clauses filter tuples prior to projection."
        }, None)

        res_output = self.client.post("/api/practical-lab/ai/analyze", json={
            "action": "explain_output",
            "sql_code": "SELECT * FROM student WHERE branch = 'CSE';",
            "execution_result": [{"rows": [{"roll_no": 101}], "columns": ["roll_no"]}]
        })
        self.assertEqual(res_output.status_code, 200)
        self.assertIn("learning_takeaway", res_output.get_json()["data"])

    def test_gemini_suggestion_never_auto_executed(self):
        """
        Verify that calling Gemini to suggest or generate SQL never touches or alters the database.
        Local MySQL execution must remain strictly explicit.
        """
        # Count tables before AI call
        tables_before = db.get_workspace_tables(self.test_workspace).get("tables", [])

        # Call AI suggest with code that creates a table
        with patch("services.gemini_service.call_gemini") as mock_call:
            mock_call.return_value = ({
                "explanation": "Generated solution",
                "suggested_sql": "CREATE TABLE should_not_auto_execute (id INT);"
            }, None)

            self.client.post("/api/practical-lab/ai/analyze", json={
                "action": "suggest",
                "sql_code": "CREATE TABLE placeholder (id INT);"
            })

        # Count tables after AI call: must be identical!
        tables_after = db.get_workspace_tables(self.test_workspace).get("tables", [])
        self.assertEqual(len(tables_before), len(tables_after))
        table_names_after = [t["name"] for t in tables_after]
        self.assertNotIn("should_not_auto_execute", table_names_after)

    # ====================================================================
    # 7. Failure Card Diagnosis & Fix Tests (Task 2)
    # ====================================================================
    def test_diagnose_failure_success(self):
        """Verify action='diagnose' returns complete structured diagnosis with all required fields."""
        mock_diagnosis = {
            "root_cause": "The table 'students' does not exist in workspace database. The schema defines singular 'student'.",
            "error_category": "Table Not Found",
            "problematic_sql": "SELECT * FROM students;",
            "corrected_sql": "SELECT * FROM student;",
            "explanation": "Corrected the relation name from plural 'students' to singular 'student'.",
            "next_action": "Click 'Insert into Editor' and re-run your query against the workspace."
        }

        with patch("services.gemini_service.call_gemini") as mock_call:
            mock_call.return_value = (mock_diagnosis, None)

            res = self.client.post("/api/practical-lab/ai/analyze", json={
                "action": "diagnose",
                "sql_code": "SELECT * FROM students;",
                "execution_error": "Table 'college_practical.students' doesn't exist",
                "workspace_name": "college_practical",
                "task_description": "Query all student records"
            })

            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data.get("success"))
            diag = data.get("data", {})

            # Must contain all required diagnosis fields
            self.assertIn("root_cause", diag)
            self.assertIn("error_category", diag)
            self.assertIn("problematic_sql", diag)
            self.assertIn("corrected_sql", diag)
            self.assertIn("explanation", diag)
            self.assertIn("next_action", diag)
            self.assertEqual(diag["error_category"], "Table Not Found")
            self.assertEqual(diag["corrected_sql"], "SELECT * FROM student;")

    def test_diagnose_failure_auth_error(self):
        """Verify actionable error alert on authentication failure (401 / bad key)."""
        with patch("services.gemini_service.call_gemini") as mock_call:
            mock_call.return_value = (None, "OpenRouter/Gemini API key rejected: 401 Unauthorized. Check your API key.")

            res = self.client.post("/api/practical-lab/ai/analyze", json={
                "action": "diagnose",
                "sql_code": "SELECT * FROM bad_syntax;",
                "execution_error": "Syntax error"
            })

            self.assertEqual(res.status_code, 400)
            data = res.get_json()
            self.assertFalse(data.get("success"))
            self.assertIn("401", data.get("error", ""))

    def test_diagnose_failure_rate_limit(self):
        """Verify graceful error reporting when AI model returns 429 rate limit."""
        with patch("services.gemini_service.call_gemini") as mock_call:
            mock_call.return_value = (None, "Gemini rate limit exceeded: 429 Too Many Requests. Please wait before retrying.")

            res = self.client.post("/api/practical-lab/ai/analyze", json={
                "action": "diagnose",
                "sql_code": "SELECT 1;",
                "execution_error": "Timeout"
            })

            self.assertEqual(res.status_code, 400)
            data = res.get_json()
            self.assertFalse(data.get("success"))
            self.assertIn("429", data.get("error", ""))

    def test_diagnose_failure_timeout(self):
        """Verify graceful error reporting on AI network timeout."""
        with patch("services.gemini_service.call_gemini") as mock_call:
            mock_call.return_value = (None, "Gemini request timed out after 30 seconds.")

            res = self.client.post("/api/practical-lab/ai/analyze", json={
                "action": "diagnose",
                "sql_code": "SELECT 1;",
                "execution_error": "Query interrupted"
            })

            self.assertEqual(res.status_code, 400)
            data = res.get_json()
            self.assertFalse(data.get("success"))
            self.assertIn("timed out", data.get("error", "").lower())

    # ====================================================================
    # 8. Workspace Dropdown & Data Structure Tests (Task 3)
    # ====================================================================
    def test_workspaces_endpoint_returns_structured_names(self):
        """Verify /api/practical-lab/workspaces returns human-readable name strings and dictionary structures."""
        res = self.client.get("/api/practical-lab/workspaces")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        workspaces = data.get("workspaces", [])
        self.assertIsInstance(workspaces, list)

        # Ensure every workspace has a valid 'name' attribute
        for ws in workspaces:
            if isinstance(ws, dict):
                self.assertIn("name", ws)
                self.assertIsInstance(ws["name"], str)
                self.assertNotEqual(ws["name"], "[object Object]")
            elif isinstance(ws, str):
                self.assertNotEqual(ws, "[object Object]")

    # ====================================================================
    # 9. Practical Save as Copy & Overwrite Prevention Tests (Task 4)
    # ====================================================================
    def test_save_practical_and_save_as_copy(self):
        """Verify saving an original practical and saving a new copy creates two distinct records."""
        # 1. Save original practical
        res_orig = self.client.post("/api/practical-lab/practicals/save", json={
            "practical_name": "Original Lab Assignment",
            "practical_number": "PR-99",
            "topic": "DDL",
            "task_description": "Create test table",
            "workspace_name": self.test_workspace,
            "sql_script": "CREATE TABLE test_tab (id INT);"
        })
        self.assertEqual(res_orig.status_code, 200)
        orig_id = res_orig.get_json().get("id")
        self.assertIsNotNone(orig_id)

        # 2. Save as copy (omits id or sets id=None)
        res_copy = self.client.post("/api/practical-lab/practicals/save", json={
            "id": None,
            "practical_name": "Original Lab Assignment (Copy)",
            "practical_number": "PR-99-C",
            "topic": "DDL",
            "task_description": "Create test table copy",
            "workspace_name": self.test_workspace,
            "sql_script": "CREATE TABLE test_tab (id INT);"
        })
        self.assertEqual(res_copy.status_code, 200)
        copy_id = res_copy.get_json().get("id")
        self.assertIsNotNone(copy_id)

        # 3. Verify both IDs are distinct and both records exist
        self.assertNotEqual(orig_id, copy_id)
        get_orig = self.client.get(f"/api/practical-lab/practicals/{orig_id}")
        get_copy = self.client.get(f"/api/practical-lab/practicals/{copy_id}")
        self.assertEqual(get_orig.status_code, 200)
        self.assertEqual(get_copy.status_code, 200)
        self.assertEqual(get_orig.get_json()["practical"]["practical_name"], "Original Lab Assignment")
        self.assertEqual(get_copy.get_json()["practical"]["practical_name"], "Original Lab Assignment (Copy)")

    # ====================================================================
    # 10. Database Connection Manager API Tests (Task 5)
    # ====================================================================
    def test_api_connection_databases_endpoint(self):
        """Verify /api/connection/databases returns list of server databases excluding system schemas."""
        res = self.client.get("/api/connection/databases")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        databases = data.get("databases", [])
        self.assertIsInstance(databases, list)
        for sys_db in ["information_schema", "performance_schema", "sys", "mysql"]:
            self.assertNotIn(sys_db, [d.lower() for d in databases])

    def test_api_connection_revert_endpoint(self):
        """Verify /api/connection/revert resets configuration to .env settings."""
        res = self.client.post("/api/connection/revert")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("config", data)
        self.assertIn("host", data["config"])
        self.assertIn("port", data["config"])

if __name__ == "__main__":
    unittest.main()
