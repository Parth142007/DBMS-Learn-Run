import unittest
from config import Config
from db import serialize_value, execute_query, test_connection
from decimal import Decimal
from datetime import datetime, date

class TestDatabaseModule(unittest.TestCase):
    
    def test_config_defaults(self):
        self.assertEqual(Config.MYSQL_HOST, "localhost")
        self.assertEqual(Config.MYSQL_PORT, 3306)
        self.assertEqual(Config.MYSQL_DATABASE, "dbms_learn_run")
        self.assertIn("DROP DATABASE", Config.RESTRICTED_KEYWORDS)

    def test_serialization(self):
        self.assertEqual(serialize_value(Decimal("45.50")), 45.5)
        self.assertEqual(serialize_value(Decimal("100.00")), 100)
        now = datetime(2026, 10, 23, 12, 0, 0)
        self.assertEqual(serialize_value(now), "2026-10-23T12:00:00")
        today = date(2026, 10, 23)
        self.assertEqual(serialize_value(today), "2026-10-23")
        self.assertEqual(serialize_value(b"test"), "test")
        self.assertIsNone(serialize_value(None))

    def test_restricted_query_blocked(self):
        res = execute_query("DROP DATABASE dbms_learn_run;")
        self.assertFalse(res["success"])
        self.assertIn("Security Notice", res["error"])

if __name__ == "__main__":
    unittest.main()
