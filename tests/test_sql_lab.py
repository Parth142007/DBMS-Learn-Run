import unittest
from init_db import split_sql_statements

class TestSqlLab(unittest.TestCase):
    
    def test_sql_splitter_standard(self):
        sql = """
        SELECT * FROM students;
        SELECT * FROM events;
        """
        stmts = split_sql_statements(sql)
        self.assertEqual(len(stmts), 2)
        self.assertTrue(stmts[0].startswith("SELECT * FROM students"))

    def test_sql_splitter_with_delimiter(self):
        sql = """
        DROP TRIGGER IF EXISTS trg_test;
        DELIMITER $$
        CREATE TRIGGER trg_test AFTER INSERT ON registrations
        FOR EACH ROW
        BEGIN
            INSERT INTO registration_audit VALUES (1);
        END$$
        DELIMITER ;
        SELECT 1;
        """
        stmts = split_sql_statements(sql)
        self.assertEqual(len(stmts), 3)

if __name__ == "__main__":
    unittest.main()
