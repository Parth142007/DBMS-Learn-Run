#!/usr/bin/env python3
"""
Launcher script for DBMS Learn & Run Local MySQL Connector
Usage:
  python run_connector.py
  python run_connector.py --port 5005
  python run_connector.py --help
"""

import sys
import os
import argparse

# Add current folder to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from local_connector.connector import start_connector, state

def main():
    parser = argparse.ArgumentParser(description="DBMS Learn & Run — Secure Local MySQL Connector Service")
    parser.add_argument("--port", type=int, default=5005, help="Port to bind connector service on (default: 5005)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface to bind (default: 127.0.0.1)")
    parser.add_argument("--mysql-host", type=str, default=None, help="MySQL host (default: localhost)")
    parser.add_argument("--mysql-port", type=int, default=None, help="MySQL port (default: 3306)")
    parser.add_argument("--mysql-user", type=str, default=None, help="MySQL user (default: root)")
    parser.add_argument("--mysql-password", type=str, default=None, help="MySQL password (default: loads from .env)")
    
    args = parser.parse_args()

    # Enforce loopback security: only 127.0.0.1 or localhost permitted
    if args.host not in ("127.0.0.1", "localhost"):
        print("Error: For security reasons, the local connector MUST bind to loopback (127.0.0.1) only.")
        sys.exit(1)

    if args.mysql_host:
        state.host = args.mysql_host
    if args.mysql_port:
        state.port = args.mysql_port
    if args.mysql_user:
        state.user = args.mysql_user
    if args.mysql_password is not None:
        state.password = args.mysql_password

    start_connector(port=args.port, host=args.host)

if __name__ == "__main__":
    main()
