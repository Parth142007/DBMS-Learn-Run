import unittest
import json
from app import app
import db

class TestPhase7TransactionsAndConcurrency(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    # ====================================================================
    # 1. Route & Template Tests
    # ====================================================================
    def test_phase7_route_success(self):
        """Verify /phase-7 returns 200 OK and renders main title, progress bar, 10 tabs, and script tag."""
        response = self.client.get("/phase-7")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 7", html)
        self.assertIn("Transactions &amp; Concurrency", html)
        self.assertIn("master-progress-bar", html)
        self.assertIn("phase7-topic-tabs", html)
        self.assertIn("Estimated Total Study Time", html)
        self.assertIn("static/js/phase7.js", html)
        self.assertIn("btn-header-open-lab", html)
        self.assertIn("btn-submit-quiz", html)

    def test_phase7_aliases(self):
        """Verify /transactions, /concurrency, and /transaction-lab act as valid routes."""
        for path in ["/transactions", "/concurrency", "/transaction-lab"]:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            html = response.get_data(as_text=True)
            self.assertIn("Phase 7", html)
            self.assertIn("static/js/phase7.js", html)

    def test_all_10_lessons_rendered(self):
        """Verify that all 10 NEPC42 syllabus lessons are included in the page."""
        response = self.client.get("/phase-7")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        expected_lessons = [
            "Introduction to Database Transactions",
            "The ACID Properties of Database Transactions",
            "Transaction States &amp; Lifecycle Management",
            "Concurrent Execution &amp; Concurrency Anomalies",
            "Schedules, Conflict Serializability &amp; Precedence Graphs",
            "Lock-Based Concurrency Control &amp; Two-Phase Locking (2PL)",
            "Deadlocks, Wait-For Graphs &amp; Victim Recovery",
            "Database Recovery, Write-Ahead Logging (WAL) &amp; Checkpoints",
            "SQL Isolation Levels &amp; MySQL 8 InnoDB Implementation",
            "Interactive Transaction Lab &amp; Capstone Assessment"
        ]
        for heading in expected_lessons:
            self.assertIn(heading, html)

    def test_topic_query_param_handling(self):
        """Verify query parameter ?topic=... handles aliases and canonical topic ids."""
        for q in ["topic1", "acid", "states", "locking", "deadlocks", "recovery", "isolation", "lab"]:
            response = self.client.get(f"/phase-7?topic={q}")
            self.assertEqual(response.status_code, 200)

    # ====================================================================
    # 2. Schedule Parsing & Conflict Serializability Algorithmic Tests
    # ====================================================================
    def test_parse_schedule_operations(self):
        """Verify parsing of standard schedule tokens into structured operations."""
        raw = "R1(X), W1(X), R2(Y), W2(Y), C1, C2"
        ops = db.parse_schedule_operations(raw)
        self.assertEqual(len(ops), 6)
        self.assertEqual(ops[0]["op"], "read")
        self.assertEqual(ops[0]["tx"], "T1")
        self.assertEqual(ops[0]["item"], "X")
        self.assertEqual(ops[1]["op"], "write")
        self.assertEqual(ops[4]["op"], "commit")
        self.assertEqual(ops[4]["tx"], "T1")

    def test_conflict_detection_and_serializability_true(self):
        """Verify that a serializable schedule is correctly analyzed and topological order is computed."""
        sched = "R1(X), W1(X), R2(X), W2(X), C1, C2"
        res = db.analyze_transaction_schedule(sched)
        self.assertTrue(res["success"])
        self.assertTrue(res["is_conflict_serializable"])
        self.assertFalse(res["has_cycle"])
        self.assertEqual(res["topological_order"], ["T1", "T2"])
        self.assertEqual(res["equivalent_serial_schedule"], "T1 -> T2")
        self.assertEqual(res["conflicts_count"], 3)  # R1(X)->W2(X), W1(X)->R2(X), W1(X)->W2(X)

    def test_conflict_detection_and_serializability_false_cycle(self):
        """Verify that a non-serializable schedule with a directed cycle is flagged."""
        sched = "R1(X), W2(X), W1(X), C1, C2"
        res = db.analyze_transaction_schedule(sched)
        self.assertTrue(res["success"])
        self.assertFalse(res["is_conflict_serializable"])
        self.assertTrue(res["has_cycle"])
        self.assertIn("T1", res["cycle_path"])
        self.assertIn("T2", res["cycle_path"])

    def test_read_read_no_conflict(self):
        """Verify that read-read operations on the same data item do not conflict."""
        sched = "R1(X), R2(X), R3(X), C1, C2, C3"
        res = db.analyze_transaction_schedule(sched)
        self.assertTrue(res["success"])
        self.assertEqual(res["conflicts_count"], 0)
        self.assertTrue(res["is_conflict_serializable"])

    def test_3_transaction_cycle(self):
        """Verify cycle detection in a 3-transaction schedule."""
        sched = "R1(X), W2(X), W2(Y), R3(Y), W3(Z), W1(Z), C1, C2, C3"
        res = db.analyze_transaction_schedule(sched)
        self.assertTrue(res["success"])
        self.assertFalse(res["is_conflict_serializable"])
        self.assertTrue(res["has_cycle"])

    # ====================================================================
    # 3. WAL Recovery Simulator Unit Tests
    # ====================================================================
    def test_wal_recovery_crash_before_commit(self):
        """Verify crash before any commit puts active transactions into UNDO list."""
        res = db.simulate_wal_recovery(crash_lsn=4)
        self.assertTrue(res["success"])
        self.assertEqual(res["redo_list"], [])
        self.assertIn("T1", res["undo_list"])
        self.assertIn("T2", res["undo_list"])
        self.assertEqual(res["recovered_state"]["A"], 5000)
        self.assertEqual(res["recovered_state"]["B"], 3000)

    def test_wal_recovery_crash_after_commit(self):
        """Verify crash after T1 commit puts T1 into REDO list and uncommitted into UNDO list."""
        res = db.simulate_wal_recovery(crash_lsn=8)
        self.assertTrue(res["success"])
        self.assertEqual(res["redo_list"], ["T1"])
        self.assertIn("T2", res["undo_list"])
        self.assertIn("T3", res["undo_list"])
        # T1 updates are preserved
        self.assertEqual(res["recovered_state"]["A"], 4000)
        self.assertEqual(res["recovered_state"]["B"], 4000)
        # T2 updates rolled back
        self.assertEqual(res["recovered_state"]["C"], 2000)

    # ====================================================================
    # 4. REST API Endpoint Tests
    # ====================================================================
    def test_api_analyze_schedule_success(self):
        """Verify POST /api/transactions/analyze-schedule returns 200 OK with graph details."""
        payload = {"schedule": "R1(X), W1(X), R2(X), W2(X), C1, C2"}
        response = self.client.post("/api/transactions/analyze-schedule",
                                   data=json.dumps(payload),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["is_conflict_serializable"])
        self.assertEqual(data["equivalent_serial_schedule"], "T1 -> T2")

    def test_api_analyze_schedule_empty_error(self):
        """Verify POST /api/transactions/analyze-schedule returns 400 for empty schedule."""
        response = self.client.post("/api/transactions/analyze-schedule",
                                   data=json.dumps({}),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_api_simulate_recovery_endpoint(self):
        """Verify POST /api/transactions/simulate-recovery returns 200 OK with recovery calculation."""
        payload = {"crash_lsn": 5}
        response = self.client.post("/api/transactions/simulate-recovery",
                                   data=json.dumps(payload),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["redo_list"], ["T1"])

    def test_api_progress_phase7_endpoints(self):
        """Verify GET and POST /api/progress/phase7."""
        # GET
        get_res = self.client.get("/api/progress/phase7?session_id=test_student_p7")
        self.assertEqual(get_res.status_code, 200)

        # POST
        post_data = {
            "session_id": "test_student_p7",
            "lesson_id": "topic1",
            "score": 5,
            "quiz_max_score": 5,
            "sim_bank_completed": True
        }
        post_res = self.client.post("/api/progress/phase7",
                                    data=json.dumps(post_data),
                                    content_type="application/json")
        self.assertEqual(post_res.status_code, 200)
        data = post_res.get_json()
        self.assertTrue(data["success"])

if __name__ == "__main__":
    unittest.main()
