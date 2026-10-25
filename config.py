import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dbms-learn-run-secret-key-2026")
    
    # MySQL Database Settings
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "dbms_learn_run")
    
    # SSL/TLS configuration for Cloud MySQL providers (e.g. TiDB, Aiven, Supabase, PlanetScale)
    MYSQL_SSL_DISABLED = os.getenv("MYSQL_SSL_DISABLED", "false").lower() in ("true", "1", "yes")
    MYSQL_SSL_CA = os.getenv("MYSQL_SSL_CA", "")

    # Environment detection
    IS_VERCEL = bool(os.getenv("VERCEL"))
    
    # Application execution parameters
    QUERY_TIMEOUT_SECONDS = int(os.getenv("QUERY_TIMEOUT_SECONDS", 10))
    MAX_ROWS_RETURNED = int(os.getenv("MAX_ROWS_RETURNED", 200))
    
    # Restricted SQL operations for student safety by default
    RESTRICTED_KEYWORDS = [
        "SHUTDOWN", "DROP DATABASE", "ALTER USER", "CREATE USER",
        "GRANT ALL", "FLUSH PRIVILEGES", "LOAD DATA INFILE"
    ]

    # AI Configuration (supports direct Gemini API key or OpenRouter API key)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


