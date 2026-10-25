"""
Tests for Bring-Your-Own-AI (BYO-AI) Provider and Key Functionality.
Validates:
- /api/practical-lab/ai/models endpoint
- /api/practical-lab/ai/test-key validation and error handling
- Zero fallback behavior when custom key fails
- Action handling for optimize, explain_schema, and practice
- No raw keys echoed in responses
"""

import json
import unittest
from unittest.mock import patch, MagicMock

from app import app
from config import Config
from services import gemini_service

class TestBringYourOwnAI(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()

    def test_list_supported_models(self):
        """Verify /api/practical-lab/ai/models lists providers and default models."""
        res = self.client.get("/api/practical-lab/ai/models")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("models", data)
        self.assertIn("gemini", data["models"])
        self.assertIn("openrouter", data["models"])
        gemini_model_ids = [m["id"] for m in data["models"]["gemini"] if isinstance(m, dict)]
        self.assertIn("gemini-2.5-flash", gemini_model_ids)

    def test_test_key_missing_key_returns_400(self):
        """Testing an empty key must return 400 Bad Request."""
        res = self.client.post("/api/practical-lab/ai/test-key", json={"api_key": ""})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get("success"))
        self.assertIn("empty", data.get("error", "").lower())

    def test_test_key_invalid_gemini_key(self):
        """Testing an invalid Gemini key should report provider error without server crash."""
        with patch.object(gemini_service, "test_ai_key", return_value=(False, "API key not valid. Please pass a valid API key.", {"provider": "gemini"})):
            res = self.client.post(
                "/api/practical-lab/ai/test-key",
                json={
                    "provider": "gemini",
                    "api_key": "invalid_fake_key_123",
                    "model": "gemini-2.5-flash"
                }
            )
            self.assertEqual(res.status_code, 400)
            data = res.get_json()
            self.assertFalse(data.get("success"))
            self.assertIn("API key not valid", data.get("error", ""))
            # Ensure key is not returned in payload
            self.assertNotIn("invalid_fake_key_123", json.dumps(data))

    def test_test_key_successful_openrouter(self):
        """Testing a valid OpenRouter key returns success."""
        with patch.object(gemini_service, "test_ai_key", return_value=(True, "Key and model verified successfully.", {"provider": "openrouter", "model": "google/gemini-2.5-flash"})):
            res = self.client.post(
                "/api/practical-lab/ai/test-key",
                json={
                    "provider": "openrouter",
                    "api_key": "sk-or-v1-validfakekey",
                    "model": "google/gemini-2.5-flash"
                }
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data.get("success"))
            self.assertIn("verified successfully", data.get("message", ""))
            self.assertEqual(data.get("provider"), "openrouter")

    def test_analyze_with_custom_headers_and_no_fallback(self):
        """
        When user passes X-AI-Key, if the custom key fails, the service must report error
        and NOT fall back silently to the server owner's key.
        """
        with patch.object(gemini_service, "call_openrouter", return_value=(None, "User credit quota exceeded (HTTP 402)")):
            res = self.client.post(
                "/api/practical-lab/ai/analyze",
                headers={
                    "X-AI-Key": "sk-or-user-test-key",
                    "X-AI-Provider": "openrouter",
                    "X-AI-Model": "google/gemini-2.5-flash"
                },
                json={
                    "action": "check",
                    "sql_code": "SELECT * FROM student;",
                    "task_description": "List students"
                }
            )
            self.assertEqual(res.status_code, 400)
            data = res.get_json()
            self.assertFalse(data.get("success"))
            self.assertIn("quota exceeded", data.get("error", ""))
            # Verify secret is not in response
            self.assertNotIn("sk-or-user-test-key", json.dumps(data))

    def test_analyze_optimize_action(self):
        """Verify optimize action dispatches successfully."""
        mock_data = {
            "optimization_summary": "Query scans entire table. Add index on roll_no.",
            "potential_bottlenecks": ["Missing index"],
            "recommended_indexes": ["CREATE INDEX idx_student_roll ON student(roll_no);"],
            "optimized_sql": "SELECT name FROM student WHERE roll_no = 101;",
            "performance_tips": ["Avoid SELECT * in production"]
        }
        with patch.object(gemini_service, "optimize_query", return_value=(mock_data, None)):
            res = self.client.post(
                "/api/practical-lab/ai/analyze",
                json={
                    "action": "optimize",
                    "sql_code": "SELECT * FROM student WHERE roll_no = 101;",
                    "task_description": "Find student 101"
                }
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data.get("success"))
            self.assertEqual(data.get("action"), "optimize")
            self.assertIn("optimization_summary", data.get("data", {}))

    def test_analyze_explain_schema_action(self):
        """Verify explain_schema action dispatches successfully."""
        mock_data = {
            "schema_overview": "Student and course registration relational model",
            "table_explanations": [
                {
                    "table_name": "student",
                    "purpose": "Stores undergraduate student records",
                    "primary_key": "roll_no",
                    "foreign_keys": "None"
                }
            ],
            "relationships_identified": ["1:N between student and enrollment"],
            "design_insights": "Normalized to 3NF"
        }
        with patch.object(gemini_service, "explain_schema", return_value=(mock_data, None)):
            res = self.client.post(
                "/api/practical-lab/ai/analyze",
                json={
                    "action": "explain_schema",
                    "workspace_name": "college_practical",
                    "schema_context": "CREATE TABLE student (roll_no INT PRIMARY KEY);"
                }
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data.get("success"))
            self.assertEqual(data.get("action"), "explain_schema")
            self.assertIn("schema_overview", data.get("data", {}))

    def test_analyze_practice_action(self):
        """Verify practice action generates challenge questions."""
        mock_data = {
            "problem_title": "Multi-Table Join Challenge",
            "problem_statement": "Write a query to retrieve student names enrolled in DBMS.",
            "learning_objective": "Inner Joins with Foreign Keys",
            "progressive_hints": ["Join student on enrollment.roll_no", "Filter by course name"],
            "expected_solution_outline": "SELECT s.name FROM student s JOIN ...",
            "starter_sql": "SELECT s.name\nFROM student s\n"
        }
        with patch.object(gemini_service, "generate_practice", return_value=(mock_data, None)):
            res = self.client.post(
                "/api/practical-lab/ai/analyze",
                json={
                    "action": "practice",
                    "topic": "joins",
                    "difficulty": "intermediate"
                }
            )
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data.get("success"))
            self.assertEqual(data.get("action"), "practice")
            self.assertIn("problem_title", data.get("data", {}))
