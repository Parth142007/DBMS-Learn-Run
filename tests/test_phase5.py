import unittest
import json
from app import app
from db import compute_attribute_closure, verify_decomposition

class TestPhase5Normalization(unittest.TestCase):
    
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    # 1. Route Tests
    def test_phase5_route_success(self):
        """Verify /phase-5 returns 200 OK and renders main title, progress bar, and 10 tabs."""
        response = self.client.get("/phase-5")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 5", html)
        self.assertIn("Database Design &amp; Normalization", html)
        self.assertIn("phase5-progress-bar", html)
        self.assertIn("phase5-topic-tabs", html)
        self.assertIn("Estimated Total Study Time", html)

    def test_normalization_alias_route(self):
        """Verify /normalization route acts as an alias to /phase-5."""
        response = self.client.get("/normalization")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Phase 5", html)
        self.assertIn("Database Design &amp; Normalization", html)

    # 2. Content & All 10 Lessons Rendered
    def test_all_10_lessons_rendered(self):
        """Verify that all 10 NEPC42 syllabus lessons are included in the page."""
        response = self.client.get("/phase-5")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        expected_lesson_headings = [
            "1. Introduction to Database Design &amp; Modification Anomalies",
            "2. Functional Dependencies &amp; Candidate Keys",
            "3. Armstrong's Axioms &amp; Inference Rules",
            "4. First Normal Form (1NF) &amp; Attribute Atomicity",
            "5. Second Normal Form (2NF) &amp; Partial Dependencies",
            "6. Third Normal Form (3NF) &amp; Transitive Dependencies",
            "7. Boyce-Codd Normal Form (BCNF) &amp; Superkey Enforcements",
            "8. Comparative Matrix: 1NF vs. 2NF vs. 3NF vs. BCNF",
            "9. Lossless Join Decomposition &amp; Dependency Preservation",
            "10. Interactive Normalization Practice Lab"
        ]
        for heading in expected_lesson_headings:
            self.assertIn(heading, html)

    # 3. Specific Normal Form Verification (BCNF vs 3NF Case Study)
    def test_bcnf_and_3nf_case_study(self):
        """Verify Lesson 7 includes the canonical 3NF-but-not-BCNF case study."""
        response = self.client.get("/phase-5")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)

        self.assertIn("STUDENT_ADVISING", html)
        self.assertIn("Instructor &rarr; Course", html)
        self.assertIn("{Student, Course} &rarr; Instructor", html)
        self.assertIn("INSTRUCTOR_ASSIGNMENT", html)
        self.assertIn("STUDENT_INSTRUCTOR", html)

    # 4. Attribute Closure Math Engine
    def test_compute_attribute_closure(self):
        """Verify backend attribute closure computation."""
        fds = [
            ({'A'}, {'B'}),
            ({'B'}, {'C'}),
            ({'C', 'D'}, {'E'})
        ]
        
        # A+ under F should be {A, B, C}
        closure_a = compute_attribute_closure({'A'}, fds)
        self.assertEqual(closure_a, {'A', 'B', 'C'})

        # {A, D}+ under F should be {A, B, C, D, E}
        closure_ad = compute_attribute_closure({'A', 'D'}, fds)
        self.assertEqual(closure_ad, {'A', 'B', 'C', 'D', 'E'})

        # Empty closure
        closure_empty = compute_attribute_closure(set(), fds)
        self.assertEqual(closure_empty, set())

    # 5. Decomposition Verification Helper
    def test_verify_decomposition_lossless_and_preserving(self):
        """Verify lossless and dependency preserving decomposition evaluation."""
        attrs = ['A', 'B', 'C']
        fds = [({'A'}, {'B'}), ({'B'}, {'C'})]
        decomposed = [['A', 'B'], ['B', 'C']]

        result = verify_decomposition(attrs, fds, decomposed)
        self.assertTrue(result['attribute_preservation'])
        self.assertTrue(result['lossless_join']) # intersection is B, and B -> C (covers R2)
        self.assertTrue(result['dependency_preservation'])

    def test_verify_decomposition_lossy(self):
        """Verify detection of lossy decomposition where intersection is not a superkey."""
        attrs = ['A', 'B', 'C']
        fds = [({'A'}, {'B'})] # C is independent
        decomposed = [['B', 'C'], ['A', 'C']] # intersection is C, but C+ = {C} neither covers R1 nor R2

        result = verify_decomposition(attrs, fds, decomposed)
        self.assertTrue(result['attribute_preservation'])
        self.assertFalse(result['lossless_join'])

    # 6. Verification API Endpoint Tests
    def test_api_verify_decomposition_success(self):
        """Verify POST /api/normalization/verify-decomposition endpoint."""
        payload = {
            "attributes": ["StudentID", "CourseID", "Grade", "StudentName"],
            "fds": [
                "{StudentID, CourseID} -> Grade",
                "StudentID -> StudentName"
            ],
            "decomposed": [
                ["StudentID", "StudentName"],
                ["StudentID", "CourseID", "Grade"]
            ]
        }
        res = self.client.post("/api/normalization/verify-decomposition", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["verification"]["attribute_preservation"])
        self.assertTrue(data["verification"]["lossless_join"])
        self.assertTrue(data["verification"]["dependency_preservation"])

    def test_api_verify_decomposition_bad_input(self):
        """Verify POST /api/normalization/verify-decomposition rejects incomplete inputs."""
        res = self.client.post("/api/normalization/verify-decomposition", json={})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data["success"])

    # 7. Progress API Persistence Tests
    def test_api_progress_save_and_retrieve(self):
        """Verify GET and POST /api/progress/phase5 persistence."""
        post_res = self.client.post("/api/progress/phase5", json={
            "lesson_id": 5,
            "score": 100,
            "answers": {"q5_1": "b", "q5_2": "a", "q5_3": "b"}
        })
        self.assertEqual(post_res.status_code, 200)
        post_data = post_res.get_json()
        self.assertTrue(post_data["success"])

        get_res = self.client.get("/api/progress/phase5")
        self.assertEqual(get_res.status_code, 200)
        get_data = get_res.get_json()
        self.assertTrue(get_data["success"])
        self.assertIsInstance(get_data["progress"], list)

    # 8. Navigation Links in Base and Index
    def test_navigation_integration(self):
        """Verify Phase 5 is linked in base navbar and index roadmap."""
        res_index = self.client.get("/")
        self.assertEqual(res_index.status_code, 200)
        html_index = res_index.get_data(as_text=True)
        self.assertIn("/phase-5", html_index)
        self.assertIn("Phase 5", html_index)

if __name__ == "__main__":
    unittest.main()
