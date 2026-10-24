import unittest
import json
from app import app

class TestPhase3Module(unittest.TestCase):
    
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_phase3_route_success(self):
        """Verify /phase-3 returns 200 OK and renders main title, laboratory, and progress bar."""
        response = self.client.get("/phase-3")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 3", html)
        self.assertIn("SQL &amp; Relational Queries", html)
        self.assertIn("Interactive SQL Laboratory", html)
        self.assertIn("Estimated Total Study Time", html)
        self.assertIn("phase3-progress-bar", html)

    def test_sql_lab_alias_route(self):
        """Verify /sql-lab route works as an alias to /phase-3."""
        response = self.client.get("/sql-lab")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 3", html)
        self.assertIn("Interactive SQL Laboratory", html)

    def test_all_10_topics_rendered(self):
        """Verify that all 10 NEPC42 syllabus topics are included in the page."""
        response = self.client.get("/phase-3")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        
        expected_topics = [
            "Data Definition Language",
            "Data Manipulation Language",
            "Data Query Language",
            "INNER JOIN",
            "LEFT JOIN",
            "RIGHT JOIN",
            "SELF JOIN",
            "CROSS JOIN",
            "Aggregate Functions, GROUP BY",
            "Nested Subqueries"
        ]
        for topic in expected_topics:
            self.assertIn(topic, html)

    def test_core_table_ddl_safeguards(self):
        """Verify that DROP and TRUNCATE on core tables are rejected by the server."""
        # 1. Attempt DROP TABLE on core 'students' table
        res_drop = self.client.post("/api/query", json={"query": "DROP TABLE students;"})
        data_drop = res_drop.get_json()
        self.assertFalse(data_drop["success"])
        self.assertIn("protected", data_drop["error"].lower())
        self.assertIn("curriculum table", data_drop["error"].lower())

        # 2. Attempt TRUNCATE TABLE on core 'departments' table
        res_trunc = self.client.post("/api/query", json={"query": "TRUNCATE TABLE departments;"})
        data_trunc = res_trunc.get_json()
        self.assertFalse(data_trunc["success"])
        self.assertIn("protected", data_trunc["error"].lower())
        self.assertIn("curriculum table", data_trunc["error"].lower())

    def test_unfiltered_dml_requires_confirmation(self):
        """Verify that UPDATE or DELETE without WHERE on core tables requires explicit confirmation."""
        # Unconfirmed UPDATE
        res = self.client.post("/api/query", json={"query": "UPDATE students SET gpa = 4.0;"})
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertTrue(data.get("requires_confirmation", False))
        self.assertIn("unfiltered", data["error"].lower())

    def test_reset_practice_table_endpoint(self):
        """Verify /api/reset-practice-table restores practice_students safely."""
        response = self.client.post("/api/reset-practice-table")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("reset", data["message"].lower())

        # Verify practice_students has 5 rows
        q_res = self.client.post("/api/query", json={"query": "SELECT * FROM practice_students;"})
        q_data = q_res.get_json()
        self.assertTrue(q_data["success"])
        self.assertEqual(len(q_data["rows"]), 5)

    def test_dql_query_execution(self):
        """Verify basic DQL SELECT returns rows, columns, and execution time."""
        response = self.client.post("/api/query", json={
            "query": "SELECT student_id, first_name, last_name, gpa FROM students ORDER BY gpa DESC LIMIT 3;"
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["is_query"])
        self.assertEqual(len(data["rows"]), 3)
        self.assertIn("student_id", data["columns"])
        self.assertIn("first_name", data["columns"])
        self.assertIn("gpa", data["columns"])
        self.assertGreaterEqual(data["execution_time_ms"], 0)

    def test_inner_join_execution(self):
        """Verify INNER JOIN returns matching rows between students and departments."""
        response = self.client.post("/api/query", json={
            "query": "SELECT s.student_id, s.first_name, s.last_name, d.dept_name FROM students s INNER JOIN departments d ON s.dept_id = d.dept_id;"
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertGreater(len(data["rows"]), 0)

    def test_left_join_unmatched_execution(self):
        """Verify LEFT JOIN correctly identifies Civil Engineering (0 students)."""
        response = self.client.post("/api/query", json={
            "query": "SELECT d.dept_name, s.student_id, s.first_name FROM departments d LEFT JOIN students s ON d.dept_id = s.dept_id WHERE s.student_id IS NULL;"
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(len(data["rows"]), 1)
        self.assertIn("Civil", data["rows"][0]["dept_name"])

    def test_right_join_unmatched_execution(self):
        """Verify RIGHT JOIN correctly identifies Event 6 with 0 registrations."""
        response = self.client.post("/api/query", json={
            "query": "SELECT e.event_id, e.event_title, r.registration_id FROM registrations r RIGHT JOIN events e ON r.event_id = e.event_id WHERE r.registration_id IS NULL;"
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(len(data["rows"]), 1)
        self.assertIn("Cybersecurity", data["rows"][0]["event_title"])

    def test_self_join_mentorship_execution(self):
        """Verify SELF JOIN pairs students with their senior mentors."""
        response = self.client.post("/api/query", json={
            "query": "SELECT s.first_name AS mentee, m.first_name AS mentor FROM students s INNER JOIN students m ON s.mentor_id = m.student_id;"
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertGreater(len(data["rows"]), 0)

    def test_aggregates_group_by_having_execution(self):
        """Verify GROUP BY and HAVING with COUNT and AVG."""
        response = self.client.post("/api/query", json={
            "query": "SELECT d.dept_name, COUNT(s.student_id) AS student_count FROM departments d LEFT JOIN students s ON d.dept_id = s.dept_id GROUP BY d.dept_id, d.dept_name HAVING student_count > 0;"
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertGreater(len(data["rows"]), 0)

    def test_subqueries_scalar_and_correlated_execution(self):
        """Verify scalar subquery and correlated NOT EXISTS subquery."""
        # 1. Scalar subquery
        res_scalar = self.client.post("/api/query", json={
            "query": "SELECT first_name, last_name, gpa FROM students WHERE gpa > (SELECT AVG(gpa) FROM students);"
        })
        data_scalar = res_scalar.get_json()
        self.assertTrue(data_scalar["success"])
        self.assertGreater(len(data_scalar["rows"]), 0)

        # 2. Correlated NOT EXISTS subquery (unregistered students)
        res_corr = self.client.post("/api/query", json={
            "query": "SELECT s.student_id, s.first_name, s.last_name FROM students s WHERE NOT EXISTS (SELECT 1 FROM registrations r WHERE r.student_id = s.student_id);"
        })
        data_corr = res_corr.get_json()
        self.assertTrue(data_corr["success"])
        self.assertEqual(len(data_corr["rows"]), 3)  # Students 8, 9, 10

    def test_query_error_handling(self):
        """Verify empty and invalid queries return safe error payloads."""
        # Empty query
        res_empty = self.client.post("/api/query", json={"query": ""})
        self.assertEqual(res_empty.status_code, 400)
        
        # Invalid syntax
        res_syntax = self.client.post("/api/query", json={"query": "SELECT * FORM students;"})
        data_syntax = res_syntax.get_json()
        self.assertFalse(data_syntax["success"])
        self.assertIn("error", data_syntax)

if __name__ == "__main__":
    unittest.main()
