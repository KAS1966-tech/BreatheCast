#!/bin/sh
set -e

DB_HOST=${DATABASE_HOST:-db}
DB_PORT=${DATABASE_PORT:-5432}
APP_PORT=${PORT:-8000}

echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT to be ready..."
python -c "
import os, socket, time

host = os.getenv('DATABASE_HOST', 'db')
port = int(os.getenv('DATABASE_PORT', 5432))

while True:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect((host, port))
        s.close()
        time.sleep(2)
        break
    except socket.error:
        time.sleep(1)
"
echo "PostgreSQL is completely ready!"

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting FastAPI app on port $APP_PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port $APP_PORT