"""
Vercel Serverless Function Entry Point for DBMS Learn & Run
Exposes the WSGI Flask application object for the Vercel Python runtime.
"""

import sys
import os

# Add parent project root to sys.path so modules (app, db, config, services) can be imported
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app import app

# Vercel looks for the WSGI application callable (named 'app')
app = app
