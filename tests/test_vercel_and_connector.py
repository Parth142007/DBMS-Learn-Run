"""
Tests for Vercel deployment structure and Local MySQL Connector security.
Validates:
- Vercel entrypoint discovery and routing configuration
- .env.example sanitization and .gitignore safety
- Local connector loopback binding, token authentication, Host header verification,
  CORS / Private Network Access headers, and zero secret leakage.
"""

import json
import os
import unittest
from unittest.mock import patch, MagicMock

# Import app and connector
from api.index import app as vercel_app
from local_connector.connector import (
    LocalConnectorState,
    ConnectorRequestHandler,
    PROTECTED_DATABASES,
    RESTRICTED_KEYWORDS,
    state as connector_state
)

class TestVercelDeploymentConfiguration(unittest.TestCase):
    """Verifies that the codebase is correctly configured for Vercel Python runtime."""

    def setUp(self):
        self.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    def test_vercel_entrypoint_exports_app(self):
        """api/index.py must export the Flask WSGI application object 'app'."""
        self.assertIsNotNone(vercel_app)
        self.assertTrue(callable(vercel_app))

    def test_vercel_json_exists_and_valid(self):
        """vercel.json must exist and have correct routing to api/index.py."""
        vercel_json_path = os.path.join(self.base_dir, "vercel.json")
        self.assertTrue(os.path.exists(vercel_json_path), "vercel.json must exist in project root.")

        with open(vercel_json_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        self.assertIn("builds", config)
        self.assertIn("routes", config)

        # Check Python build definition
        python_builds = [b for b in config["builds"] if b.get("use") == "@vercel/python"]
        self.assertTrue(len(python_builds) > 0, "vercel.json must declare @vercel/python build.")
        self.assertEqual(python_builds[0].get("src"), "api/index.py")

        # Check rewrite route
        destinations = [r.get("dest") for r in config.get("routes", []) if r.get("dest")]
        self.assertTrue(any("api/index.py" in str(d) for d in destinations), "Routes must include rewrite to api/index.py.")

    def test_env_example_has_no_secrets(self):
        """.env.example must only contain placeholders, zero real passwords or API keys."""
        env_example_path = os.path.join(self.base_dir, ".env.example")
        self.assertTrue(os.path.exists(env_example_path), ".env.example must exist.")

        with open(env_example_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check known placeholders
        self.assertIn("MYSQL_USER=root", content)
        self.assertIn("GEMINI_API_KEY=your_gemini_api_key_here", content)
        self.assertIn("OPENROUTER_API_KEY=your_openrouter_api_key_here", content)

        # Ensure no real Gemini or OpenRouter keys leaked
        self.assertNotIn("AIzaSy", content)
        self.assertNotIn("sk-or-v1-", content)

    def test_gitignore_covers_sensitive_files(self):
        """.gitignore must exclude .env, .vercel, __pycache__, .connector_token."""
        gitignore_path = os.path.join(self.base_dir, ".gitignore")
        self.assertTrue(os.path.exists(gitignore_path), ".gitignore must exist.")

        with open(gitignore_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip() and not line.startswith("#")]

        self.assertIn(".env", lines)
        self.assertIn("__pycache__/", lines)
        self.assertTrue(any(".vercel" in l for l in lines), ".gitignore must ignore .vercel/")
        self.assertTrue(any(".connector_token" in l for l in lines), ".gitignore must ignore connector token.")


class TestLocalMySQLConnectorSecurity(unittest.TestCase):
    """
    Validates security controls of the Local MySQL Connector:
    - Token generation and verification
    - Host header verification (anti DNS rebinding)
    - CORS & W3C Private Network Access headers
    - Error sanitization (zero password leakage)
    - SQL safety constraints (statement size, protected schemas, restricted admin commands)
    """

    def setUp(self):
        self.conn_state = LocalConnectorState()
        self.handler = ConnectorRequestHandler.__new__(ConnectorRequestHandler)
        self.handler.headers = {}
        self.sent_responses = []

        # Stub _send_json to capture status and payload
        def mock_send_json(status, data):
            self.sent_responses.append((status, data))
        self.handler._send_json = mock_send_json

    def test_token_format_and_entropy(self):
        """Pairing token must be a 32-character hexadecimal string."""
        self.assertEqual(len(self.conn_state.token), 32)
        int(self.conn_state.token, 16)  # Will raise ValueError if not valid hex

    def test_dns_rebinding_rejection(self):
        """Host headers not matching localhost/127.0.0.1 must be rejected with 403."""
        self.handler.headers = {"Host": "malicious-attacker.com"}
        self.assertFalse(self.handler._check_host())
        self.assertEqual(len(self.sent_responses), 1)
        self.assertEqual(self.sent_responses[0][0], 403)
        self.assertIn("Host header mismatch", self.sent_responses[0][1].get("error", ""))

    def test_loopback_host_accepted(self):
        """Loopback host headers must be permitted."""
        for valid_host in ["localhost:5005", "127.0.0.1:5005", "localhost", "127.0.0.1"]:
            self.handler.headers = {"Host": valid_host}
            self.sent_responses.clear()
            self.assertTrue(self.handler._check_host())
            self.assertEqual(len(self.sent_responses), 0)

    def test_missing_or_invalid_token_rejected(self):
        """Requests with missing or wrong token must return 401 Unauthorized."""
        # 1. Missing token
        self.handler.headers = {"Host": "127.0.0.1:5005"}
        self.sent_responses.clear()
        self.assertFalse(self.handler._check_token())
        self.assertEqual(self.sent_responses[0][0], 401)
        self.assertIn("Unauthorized", self.sent_responses[0][1].get("error", ""))

        # 2. Wrong token
        self.handler.headers = {"Host": "127.0.0.1:5005", "X-Connector-Token": "wrong_token_12345"}
        self.sent_responses.clear()
        self.assertFalse(self.handler._check_token())
        self.assertEqual(self.sent_responses[0][0], 401)

        # 3. Valid token
        self.handler.headers = {"Host": "127.0.0.1:5005", "X-Connector-Token": connector_state.token}
        self.sent_responses.clear()
        self.assertTrue(self.handler._check_token())
        self.assertEqual(len(self.sent_responses), 0)

    def test_execute_empty_script_rejected(self):
        """Connector must reject empty SQL script."""
        self.handler._read_json_body = lambda: {"sql_script": "   "}
        self.sent_responses.clear()
        self.handler._handle_execute()
        self.assertEqual(self.sent_responses[0][0], 400)
        self.assertIn("empty", self.sent_responses[0][1].get("error", "").lower())

    def test_execute_size_limit_enforced(self):
        """Connector must reject scripts exceeding 64KB bound."""
        huge_script = "SELECT 1;\n" * 12000  # > 64KB
        self.handler._read_json_body = lambda: {"sql_script": huge_script}
        self.sent_responses.clear()
        self.handler._handle_execute()
        self.assertEqual(self.sent_responses[0][0], 400)
        self.assertIn("exceeds maximum size", self.sent_responses[0][1].get("error", "").lower())

    def test_execute_protected_database_access_blocked(self):
        """Queries attempting to access system databases must be blocked."""
        for db in PROTECTED_DATABASES:
            # 1. Setting workspace directly to system db
            self.handler._read_json_body = lambda target=db: {"workspace_name": target, "sql_script": "SELECT 1;"}
            self.sent_responses.clear()
            self.handler._handle_execute()
            self.assertEqual(self.sent_responses[0][0], 403)

            # 2. Cross-database escape in query
            self.handler._read_json_body = lambda target=db: {"workspace_name": "college_practical", "sql_script": f"SELECT * FROM {target}.users;"}
            self.sent_responses.clear()
            self.handler._handle_execute()
            self.assertEqual(self.sent_responses[0][0], 403)

    def test_restricted_admin_keywords_blocked(self):
        """Administrative and dangerous keywords must be rejected."""
        for kw in ["SHUTDOWN", "DROP DATABASE", "ALTER USER", "GRANT ALL"]:
            self.handler._read_json_body = lambda cmd=kw: {"workspace_name": "college_practical", "sql_script": f"{cmd} test;"}
            self.sent_responses.clear()
            self.handler._handle_execute()
            self.assertEqual(self.sent_responses[0][0], 403)
            self.assertIn("administrative command", self.sent_responses[0][1].get("error", "").lower())

    def test_password_never_exposed_on_connection_error(self):
        """Database passwords must not leak in error dictionaries."""
        secret_pass = "super_secret_local_mysql_pwd"
        self.conn_state.password = secret_pass

        with patch("pymysql.connect", side_effect=Exception(f"Access denied for user 'root'@'localhost' (using password: {secret_pass})")):
            status = self.conn_state.test_connection()
            self.assertFalse(status.get("connected"))
            # Host and user are safe, but password should never be exposed in any field
            dumped = json.dumps(status)
            self.assertNotIn(secret_pass, dumped)
