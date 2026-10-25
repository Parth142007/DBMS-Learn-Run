import unittest
import json
from app import app
from config import Config
import db

class TestNavigationAndConnection(unittest.TestCase):
    
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    # ====================================================================
    # Task 1: Duplicate Card Removal on Dashboard
    # ====================================================================
    def test_dashboard_no_duplicate_card(self):
        """Verify the duplicate Phase 4/5 Module 2 card is removed while Phase 6 card remains."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        # Obsolete duplicate card badge should NOT be in dashboard
        self.assertNotIn('<span class="badge bg-light text-secondary border">Phase 4/5</span>', html)
        self.assertNotIn('<span class="badge bg-success mb-2">Module 2</span>', html)

        # All 6 real modules must be present
        self.assertIn("Launch Phase 2 Module", html)
        self.assertIn("Launch Phase 3 Module", html)
        self.assertIn("Launch Phase 4 Module", html)
        self.assertIn("Launch Phase 5 Module", html)
        self.assertIn("Launch Phase 6 Module", html)
        self.assertIn("Launch Phase 7 Module", html)

    # ====================================================================
    # Task 2: Simplified Top Header
    # ====================================================================
    def test_top_header_simplified(self):
        """Verify header contains only brand, ER Builder, and MySQL status."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        # Brand present
        self.assertIn("DBMS Learn & Run", html)

        # Syllabus badge removed from header
        self.assertNotIn("brand-badge", html)

        # ER Builder button present with correct ID and target
        self.assertIn('id="btn-header-open-builder"', html)
        self.assertIn('href="/phase-6?topic=topic10&tool=builder#interactive-er-builder-section"', html)

        # MySQL status button present
        self.assertIn('id="btn-header-mysql-status"', html)

        # Header nav links removed from top navbar
        self.assertNotIn('Phase 2: Intro', html)
        self.assertNotIn('Phase 3: SQL Lab', html)
        self.assertNotIn('Phase 4: Views &amp; Security', html)
        self.assertNotIn('Phase 5: Normalization', html)
        self.assertNotIn('Phase 6: ER &amp; Relational', html)
        self.assertNotIn('Phase 7: Transactions', html)
        self.assertNotIn('Schema Inspector', html)

    # ====================================================================
    # Task 4: Sidebar Cleanup
    # ====================================================================
    def test_sidebar_er_model_and_schemas_removed(self):
        """Verify 'ER Model & Schemas' link is removed while other Module 2 items remain."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        # Obsolete sidebar link removed
        self.assertNotIn("ER Model &amp; Schemas", html)
        self.assertNotIn("ER Model & Schemas", html)

        # Sibling links preserved
        self.assertIn("Relational Model", html)
        self.assertIn("Relational Algebra Lab", html)

        # Core navigation preserved
        self.assertIn("Platform Overview", html)
        self.assertIn("Database Schema (8 Tables)", html)

    # ====================================================================
    # Task 3: MySQL Connection Testing & Application API
    # ====================================================================
    def test_api_health_endpoint(self):
        """Verify /api/health returns structured status without exposing secrets."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data(as_text=True))
        self.assertIn("database_connected", data)
        self.assertIn("database_exists", data)
        self.assertIn("mysql_version", data)
        self.assertIn("table_count", data)
        self.assertIn("database", data)
        self.assertNotIn("password", data)

    def test_api_test_connection_invalid_port(self):
        """Verify /api/test-connection rejects invalid port numbers gracefully."""
        response = self.client.post("/api/test-connection", json={
            "host": "localhost",
            "port": "invalid-port",
            "user": "root"
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.get_data(as_text=True))
        self.assertFalse(data["connected"])
        self.assertIn("Port must be a valid integer", data["error"])

    def test_api_test_connection_bad_credentials(self):
        """Verify /api/test-connection reports failure safely without leaking secrets."""
        response = self.client.post("/api/test-connection", json={
            "host": "localhost",
            "port": 3306,
            "user": "non_existent_user_99999",
            "password": "wrong_password_xyz"
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.get_data(as_text=True))
        self.assertFalse(data["connected"])
        self.assertIsNotNone(data["error"])
        # Crucial security check: password must NEVER be in response
        self.assertNotIn("wrong_password_xyz", json.dumps(data))

    def test_test_connection_does_not_modify_active_config(self):
        """Verify that testing a connection does not silently alter Config."""
        orig_host = Config.MYSQL_HOST
        orig_user = Config.MYSQL_USER

        response = self.client.post("/api/test-connection", json={
            "host": "127.0.0.99",
            "port": 3399,
            "user": "temporary_user"
        })
        # Config should remain unmodified
        self.assertEqual(Config.MYSQL_HOST, orig_host)
        self.assertEqual(Config.MYSQL_USER, orig_user)

    def test_api_apply_connection_rejects_unverified(self):
        """Verify that /api/apply-connection rejects invalid connections without modifying active config."""
        orig_host = Config.MYSQL_HOST
        orig_user = Config.MYSQL_USER

        response = self.client.post("/api/apply-connection", json={
            "host": "127.0.0.99",
            "port": 3399,
            "user": "temporary_user",
            "password": "wrong_password"
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.get_data(as_text=True))
        self.assertFalse(data["success"])
        self.assertIn("Cannot apply settings", data["error"])
        # Config remains safe and unchanged
        self.assertEqual(Config.MYSQL_HOST, orig_host)
        self.assertEqual(Config.MYSQL_USER, orig_user)

if __name__ == "__main__":
    unittest.main()
