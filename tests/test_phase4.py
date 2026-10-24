import unittest
import json
from app import app

class TestPhase4Module(unittest.TestCase):
    
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_phase4_route_success(self):
        """Verify /phase-4 returns 200 OK and renders main title, progress bar, and syllabus info."""
        response = self.client.get("/phase-4")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 4", html)
        self.assertIn("Views, Triggers &amp; Security", html)
        self.assertIn("phase4-progress-bar", html)
        self.assertIn("phase4-topic-tabs", html)
        self.assertIn("Estimated Total Study Time", html)

    def test_views_triggers_alias_route(self):
        """Verify /views-triggers route acts as a proper alias to /phase-4."""
        response = self.client.get("/views-triggers")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 4", html)
        self.assertIn("Views, Triggers &amp; Security", html)

    def test_all_5_topics_rendered(self):
        """Verify that all 5 NEPC42 syllabus topics are included in the page."""
        response = self.client.get("/phase-4")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        expected_topic_headings = [
            "1. Database Views &amp; Updatable Views",
            "2. BEFORE &amp; AFTER Database Triggers",
            "3. Relational Database Constraints",
            "4. MySQL Stored Procedures",
            "5. Authorization, Roles &amp; Database Security"
        ]
        for heading in expected_topic_headings:
            self.assertIn(heading, html)

    def test_view_inspection_api(self):
        """Verify POST /api/view/inspect distinguishes updatable and non-updatable views."""
        # 1. Non-updatable complex join view
        res1 = self.client.post("/api/view/inspect", json={"view_name": "vw_student_mentorship"})
        self.assertEqual(res1.status_code, 200)
        data1 = res1.get_json()
        self.assertTrue(data1["success"])
        self.assertFalse(data1["is_updatable"])
        self.assertIn("CREATE", data1["create_statement"].upper())

        # 2. Updatable practice view
        res2 = self.client.post("/api/view/inspect", json={"view_name": "vw_practice_students"})
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertTrue(data2["success"])
        self.assertTrue(data2["is_updatable"])

        # 3. Security rejection on arbitrary view name
        res3 = self.client.post("/api/view/inspect", json={"view_name": "non_existent_secret_table"})
        self.assertEqual(res3.status_code, 400)
        data3 = res3.get_json()
        self.assertFalse(data3["success"])

    def test_trigger_api_capacity_and_audit(self):
        """Verify POST /api/trigger/test fires real triggers and returns responses."""
        # 1. Test BEFORE INSERT capacity enforcement (should trigger SIGNAL 45000)
        res_cap = self.client.post("/api/trigger/test", json={"action": "capacity_check"})
        self.assertEqual(res_cap.status_code, 200)
        data_cap = res_cap.get_json()
        self.assertTrue(data_cap["trigger_fired"])
        self.assertIn("capacity", data_cap["error_message"].lower())

        # 2. Test AFTER INSERT audit log generation
        res_audit = self.client.post("/api/trigger/test", json={"action": "audit_log"})
        self.assertEqual(res_audit.status_code, 200)
        data_audit = res_audit.get_json()
        self.assertTrue(data_audit["success"])
        self.assertIsNotNone(data_audit["inserted_registration_id"])
        self.assertIsInstance(data_audit["audit_records"], list)

        # 3. Test invalid action rejection
        res_invalid = self.client.post("/api/trigger/test", json={"action": "unknown_action"})
        self.assertEqual(res_invalid.status_code, 400)
        self.assertFalse(res_invalid.get_json()["success"])

    def test_constraint_api_scenarios(self):
        """Verify POST /api/constraint/test tests PK, UNIQUE, NOT NULL, CHECK, FK and DEFAULT."""
        scenarios = ["duplicate_pk", "duplicate_unique", "not_null_violation", "check_violation", "fk_violation"]
        for sc in scenarios:
            res = self.client.post("/api/constraint/test", json={"scenario": sc})
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data["constraint_violated"], f"Expected violation for scenario {sc}")
            self.assertIsNotNone(data["error_message"])

        # Test DEFAULT scenario (should succeed)
        res_def = self.client.post("/api/constraint/test", json={"scenario": "default_test"})
        self.assertEqual(res_def.status_code, 200)
        data_def = res_def.get_json()
        self.assertTrue(data_def["success"])
        self.assertFalse(data_def["constraint_violated"])

        # Test invalid scenario rejection
        res_err = self.client.post("/api/constraint/test", json={"scenario": "invalid_scenario"})
        self.assertEqual(res_err.status_code, 400)

    def test_stored_procedure_execution_api(self):
        """Verify POST /api/procedure/call executes approved procedures with whitelist enforcement."""
        # 1. Call sp_get_students_by_department
        res1 = self.client.post("/api/procedure/call", json={
            "procedure_name": "sp_get_students_by_department",
            "params": ["CSE"]
        })
        self.assertEqual(res1.status_code, 200)
        data1 = res1.get_json()
        self.assertTrue(data1["success"])
        self.assertGreater(len(data1["result_sets"]), 0)
        first_row = data1["result_sets"][0][0]
        self.assertIn("roll_no", first_row)
        self.assertIn("dept_name", first_row)

        # 2. Call sp_calculate_dept_gpa (OUT parameters)
        res2 = self.client.post("/api/procedure/call", json={
            "procedure_name": "sp_calculate_dept_gpa",
            "params": ["CSE"]
        })
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertTrue(data2["success"])
        self.assertIn("out_avg_gpa", data2["out_parameters"])
        self.assertIn("out_student_count", data2["out_parameters"])

        # 3. Reject unapproved procedure name
        res3 = self.client.post("/api/procedure/call", json={
            "procedure_name": "arbitrary_malicious_proc",
            "params": []
        })
        self.assertEqual(res3.status_code, 400)
        self.assertFalse(res3.get_json()["success"])

    def test_practice_sandbox_reset(self):
        """Verify POST /api/reset-practice recreates practice_students and test views."""
        res = self.client.post("/api/reset-practice")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("reset", data["message"].lower())

if __name__ == "__main__":
    unittest.main()
