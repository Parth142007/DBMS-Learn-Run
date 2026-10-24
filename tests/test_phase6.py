import unittest
import json
from app import app
import db

class TestPhase6ErAndRelationalModel(unittest.TestCase):
    
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    # ====================================================================
    # 1. Route Tests
    # ====================================================================
    def test_phase6_route_success(self):
        """Verify /phase-6 returns 200 OK and renders main title, progress bar, 10 tabs, script tag, and builder buttons."""
        response = self.client.get("/phase-6")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 6", html)
        self.assertIn("ER &amp; Relational Model", html)
        self.assertIn("master-progress-bar", html)
        self.assertIn("phase6-topic-tabs", html)
        self.assertIn("Estimated Total Study Time", html)
        self.assertIn("static/js/phase6.js", html)
        self.assertIn("btn-jump-er-builder", html)
        self.assertIn("btn-submit-quiz", html)

    def test_er_builder_route(self):
        """Verify /er-builder route returns 200 OK with phase6.js and topic10 builder section."""
        response = self.client.get("/er-builder")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("static/js/phase6.js", html)
        self.assertIn("interactive-er-builder-section", html)

    def test_er_model_alias_route(self):
        """Verify /er-model route acts as an alias to /phase-6."""
        response = self.client.get("/er-model")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 6", html)
        self.assertIn("ER &amp; Relational Model", html)

    def test_all_10_lessons_rendered(self):
        """Verify that all 10 NEPC42 syllabus lessons are included in the page."""
        response = self.client.get("/phase-6")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        expected_lessons = [
            "Introduction to the Entity-Relationship (ER) Model",
            "Attributes &amp; Keys in the Conceptual &amp; Relational Model",
            "Relationships, Degree &amp; Recursive Roles",
            "Cardinality Constraints (1:1, 1:N, N:1, M:N)",
            "Participation Constraints (Total vs. Partial)",
            "Weak Entities &amp; Identifying Relationships",
            "Extended Entity-Relationship (EER) Concepts",
            "Systematic Mapping: ER Diagrams to Relational Schemas",
            "Relational Model Fundamentals &amp; Integrity Constraints",
            "Relational Algebra &amp; Interactive Learning Labs"
        ]
        for heading in expected_lessons:
            self.assertIn(heading, html)

    def test_topic_query_param_handling(self):
        """Verify query parameter ?topic=... handles aliases and canonical topic ids."""
        for q in ["topic4", "cardinality", "topic10", "relational-algebra"]:
            response = self.client.get(f"/phase-6?topic={q}")
            self.assertEqual(response.status_code, 200)

    # ====================================================================
    # 2. ER Concepts, Notation & Example Checks
    # ====================================================================
    def test_chen_notation_and_symbols_present(self):
        """Verify standard Chen notation symbols and college entities are present."""
        response = self.client.get("/phase-6")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        self.assertIn("Double Rectangle", html)
        self.assertIn("Double Diamond", html)
        self.assertIn("Total Participation", html)
        self.assertIn("Multivalued Attribute", html)
        self.assertIn("Derived Attribute", html)
        self.assertIn("EMPLOYEE", html)
        self.assertIn("DEPENDENT", html)

    # ====================================================================
    # 3. Relational Algebra Safe Evaluator Unit Tests
    # ====================================================================
    def test_eval_selection(self):
        """Test relational selection (sigma) filters rows correctly."""
        res = db.evaluate_relational_algebra("select", "STUDENT", condition="DepartmentID = 10")
        self.assertTrue(res["success"])
        self.assertEqual(res["cardinality"], 2)
        student_names = [r["StudentName"] for r in res["rows"]]
        self.assertIn("Amit", student_names)
        self.assertIn("Ravi", student_names)

    def test_eval_projection_duplicate_elimination(self):
        """Test projection (pi) strictly eliminates duplicate tuples (Set Semantics)."""
        res = db.evaluate_relational_algebra("project", "STUDENT", attributes=["DepartmentID"])
        self.assertTrue(res["success"])
        # In STUDENT: Dept IDs are 10, 20, 10, 30. Unique set = {10, 20, 30} (3 rows, 1 duplicate removed)
        self.assertEqual(res["cardinality"], 3)
        self.assertEqual(res["duplicates_removed"], 1)

    def test_eval_union_and_compatibility(self):
        """Test union combines compatible relations and rejects incompatible degrees."""
        # 1. Valid Union
        res = db.evaluate_relational_algebra("union", "STUDENT", "HONOR_STUDENT")
        self.assertTrue(res["success"])
        # STUDENT (4) + HONOR_STUDENT (3: Neha 102, Sara 104, Vikram 105).
        # Neha and Sara overlap, Vikram is new. Total unique = 5.
        self.assertEqual(res["cardinality"], 5)

        # 2. Incompatible Union (STUDENT degree 4 vs DEPARTMENT degree 2)
        bad_res = db.evaluate_relational_algebra("union", "STUDENT", "DEPARTMENT")
        self.assertFalse(bad_res["success"])
        self.assertIn("Union Compatibility", bad_res["error"])

    def test_eval_set_difference(self):
        """Test set difference (R1 - R2) removes overlapping tuples."""
        res = db.evaluate_relational_algebra("difference", "STUDENT", "HONOR_STUDENT")
        self.assertTrue(res["success"])
        # STUDENT has Amit (101), Neha (102), Ravi (103), Sara (104).
        # HONOR_STUDENT has Neha (102), Sara (104), Vikram (105).
        # Diff = {Amit (101), Ravi (103)} -> 2 tuples.
        self.assertEqual(res["cardinality"], 2)
        diff_names = [r["StudentName"] for r in res["rows"]]
        self.assertIn("Amit", diff_names)
        self.assertIn("Ravi", diff_names)

    def test_eval_cartesian_product(self):
        """Test Cartesian product (R1 x R2) multiplies tuples and degrees."""
        res = db.evaluate_relational_algebra("cartesian", "STUDENT", "DEPARTMENT")
        self.assertTrue(res["success"])
        # 4 students x 4 departments = 16 tuples
        self.assertEqual(res["cardinality"], 16)
        # Degree: 4 + 2 = 6 attributes
        self.assertEqual(res["degree"], 6)

    def test_eval_natural_join(self):
        """Test natural join equates common DepartmentID attribute."""
        res = db.evaluate_relational_algebra("natural_join", "STUDENT", "DEPARTMENT")
        self.assertTrue(res["success"])
        # All 4 students match an existing department (10, 20, 30)
        self.assertEqual(res["cardinality"], 4)
        # Check column merging: DepartmentID appears once
        self.assertIn("DepartmentID", res["columns"])
        self.assertIn("DepartmentName", res["columns"])
        self.assertIn("StudentName", res["columns"])

    def test_eval_relational_division(self):
        """Test relational division (R1 ÷ R2) finds students taking ALL required CS courses."""
        # STUDENT_COURSE ÷ CS_COURSE
        # CS_COURSE requires C101 and C102. Only student 101 has both C101 and C102.
        res = db.evaluate_relational_algebra("division", "STUDENT_COURSE", "CS_COURSE")
        self.assertTrue(res["success"])
        self.assertEqual(res["cardinality"], 1)
        self.assertEqual(res["rows"][0]["StudentID"], 101)

    def test_eval_invalid_attribute_error(self):
        """Test that projecting non-existent attributes returns a clean educational error."""
        res = db.evaluate_relational_algebra("project", "STUDENT", attributes=["NonExistentColumn"])
        self.assertFalse(res["success"])
        self.assertIn("does not exist", res["error"])

    # ====================================================================
    # 4. REST API Endpoint Tests
    # ====================================================================
    def test_api_relational_algebra_datasets(self):
        """Test GET /api/relational-algebra/datasets returns predefined tables."""
        response = self.client.get("/api/relational-algebra/datasets")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertIn("STUDENT", data["datasets"])
        self.assertIn("DEPARTMENT", data["datasets"])
        self.assertIn("COURSE", data["datasets"])

    def test_api_relational_algebra_eval_endpoint(self):
        """Test POST /api/relational-algebra/eval via HTTP request."""
        payload = {
            "operator": "select",
            "relation1": "STUDENT",
            "condition": "GPA >= 8.5"
        }
        response = self.client.post("/api/relational-algebra/eval", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["cardinality"], 3)  # Amit (8.5), Neha (9.2), Sara (8.9)

    def test_api_phase6_progress_persistence(self):
        """Test saving and retrieving progress for Phase 6."""
        # POST
        save_payload = {
            "session_id": "test_student_phase6",
            "lesson_id": "topic1",
            "score": 5,
            "quiz_max_score": 5,
            "completed": True
        }
        res_post = self.client.post("/api/progress/phase6", json=save_payload)
        self.assertEqual(res_post.status_code, 200)
        post_data = json.loads(res_post.data)
        self.assertTrue(post_data["success"])

        # GET
        res_get = self.client.get("/api/progress/phase6?session_id=test_student_phase6")
        self.assertEqual(res_get.status_code, 200)
        get_data = json.loads(res_get.data)
        self.assertTrue(get_data["success"])
        saved_lessons = [row["lesson_id"] for row in get_data["progress"]]
        self.assertIn("topic1", saved_lessons)

if __name__ == "__main__":
    unittest.main()
