import unittest
from app import app

class TestPhase2Module(unittest.TestCase):
    
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_phase2_route_success(self):
        """Verify /phase-2 returns 200 OK and renders main title and metadata."""
        response = self.client.get("/phase-2")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 2", html)
        self.assertIn("Introduction to DBMS", html)
        self.assertIn("NEPC42 Syllabus", html)
        self.assertIn("Estimated Total Study Time", html)

    def test_module1_alias_route(self):
        """Verify /module-1 route works as an alias to /phase-2."""
        response = self.client.get("/module-1")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Introduction to DBMS", html)

    def test_topic1_architecture_content(self):
        """Verify Topic 1 Database System Architecture content and diagrams."""
        response = self.client.get("/phase-2?topic=architecture")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Database System Architecture", html)
        self.assertIn("One-Tier", html)
        self.assertIn("Two-Tier", html)
        self.assertIn("Three-Tier", html)
        self.assertIn("Fat Client", html)
        self.assertIn("Query Processor", html)
        self.assertIn("Storage Manager", html)
        self.assertIn("Data Dictionary", html)
        self.assertIn("Diagram 1.1", html)
        self.assertIn("Diagram 1.2", html)
        self.assertIn("Diagram 1.3", html)

    def test_topic2_data_models_content(self):
        """Verify Topic 2 Data Models content and diagrams."""
        response = self.client.get("/phase-2?topic=data-models")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Hierarchical Data Model", html)
        self.assertIn("Network Data Model", html)
        self.assertIn("Relational Data Model", html)
        self.assertIn("Entity-Relationship (ER) Model", html)
        self.assertIn("Object-Oriented Data Model", html)
        self.assertIn("Diagram 2.1", html)
        self.assertIn("Diagram 2.2", html)
        self.assertIn("Diagram 2.3", html)

    def test_topic3_three_schema_content(self):
        """Verify Topic 3 Three-Schema Architecture content, mappings, and distinction."""
        response = self.client.get("/phase-2?topic=three-schema")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Three-Schema Architecture", html)
        self.assertIn("External Schema", html)
        self.assertIn("Conceptual Schema", html)
        self.assertIn("Internal Schema", html)
        self.assertIn("External / Conceptual Mapping", html)
        self.assertIn("Conceptual / Internal Mapping", html)
        self.assertIn("Three-Schema vs. Three-Tier", html)
        self.assertIn("Diagram 3.1", html)

    def test_topic4_data_independence_content(self):
        """Verify Topic 4 Data Independence content, comparisons, and simulator."""
        response = self.client.get("/phase-2?topic=data-independence")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Data Independence", html)
        self.assertIn("Physical Data Independence", html)
        self.assertIn("Logical Data Independence", html)
        self.assertIn("Live Conceptual Schema Evolution Simulator", html)
        self.assertIn("sim-scenario-pills", html)
        self.assertIn("Diagram 4.1", html)

    def test_quizzes_present(self):
        """Verify interactive quizzes exist for all 4 syllabus topics."""
        response = self.client.get("/phase-2")
        html = response.get_data(as_text=True)
        self.assertIn("quiz-container-1", html)
        self.assertIn("quiz-container-2", html)
        self.assertIn("quiz-container-3", html)
        self.assertIn("quiz-container-4", html)
        self.assertIn("arch-q1", html)
        self.assertIn("dm-q1", html)
        self.assertIn("ts-q1", html)
        self.assertIn("di-q1", html)

    def test_invalid_topic_query_param(self):
        """Verify unknown topic query param safely defaults to architecture."""
        response = self.client.get("/phase-2?topic=invalid_topic_name")
        self.assertEqual(response.status_code, 200)

    def test_dashboard_links_to_phase2(self):
        """Verify main dashboard links directly to Phase 2 module."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("/phase-2", html)
        self.assertIn("Launch Phase 2 Module", html)

    def test_existing_schema_inspector(self):
        """Verify existing /schema route continues to work."""
        response = self.client.get("/schema")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Relational Schema Inspector", html)

    def test_existing_api_health(self):
        """Verify /api/health endpoint functions as expected."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("status", data)
        self.assertIn("database_connected", data)

    def test_existing_api_query_validation(self):
        """Verify /api/query endpoint validates empty input."""
        response = self.client.post("/api/query", json={"query": ""})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data["success"])
        self.assertIn("Query cannot be empty", data["error"])

if __name__ == "__main__":
    unittest.main()
