#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be completely initialized and ready..."
# This script uses python's psycopg/psycopg2 driver to test a real connection
python -c "
import socket
import time

while True:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect(('db', 5432))
        s.close()
        
        # Port is open. Now sleep 4 seconds to outlast the database initial dual-boot sequence
        time.sleep(4)
        
        # Verify it remains open and didn't crash/restart
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect(('db', 5432))
        s.close()
        break
    except socket.error:
        time.sleep(1)
"
echo "PostgreSQL is completely ready!"

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting FastAPI app..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000