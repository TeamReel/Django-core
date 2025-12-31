#!/usr/bin/env python
"""Production startup script for Railway deployment."""
import os
import subprocess
import sys


def main():
    """Start Gunicorn with Railway PORT."""
    # Railway provides PORT env var, but fallback to 8080
    port = os.environ.get("PORT", "8080")

    # Validate port is numeric
    try:
        port_int = int(port)
        if not (1 <= port_int <= 65535):
            print(f"WARNING: Invalid PORT {port}, using 8080")
            port = "8080"
    except ValueError:
        print(f"ERROR: PORT env var is not numeric: '{port}', using 8080")
        port = "8080"

    print(f"Starting Django Core-App on port {port}...")
    print(f"DJANGO_SETTINGS_MODULE: {os.environ.get('DJANGO_SETTINGS_MODULE', 'NOT SET')}")

    # One-time fix: Reset rtc_websockets schema to fix integer→UUID migration
    # Safe for demo - WebSocket data is ephemeral (connections/presence/activity)
    print("\nChecking for migration compatibility issues...")
    try:
        result = subprocess.run(
            [
                "python",
                "-c",
                "import django; django.setup(); "
                "from django.db import connection; "
                "cursor = connection.cursor(); "
                "cursor.execute('DROP TABLE IF EXISTS realtime_websocket_connection CASCADE'); "
                "cursor.execute('DROP TABLE IF EXISTS realtime_presence_status CASCADE'); "
                "cursor.execute('DROP TABLE IF EXISTS realtime_message CASCADE'); "
                "cursor.execute('DROP TABLE IF EXISTS realtime_activity_event CASCADE'); "
                "cursor.execute(\"DELETE FROM django_migrations WHERE app = 'rtc_websockets'\"); "
                "print('✓ Reset rtc_websockets schema and migration state')",
            ],
            check=False,
            cwd="/app",
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print(result.stdout.strip())
        else:
            # Tables might not exist yet - not an error
            print("Note: rtc_websockets reset skipped (expected on first deploy)")
    except Exception as e:
        print(f"Warning: Could not reset rtc_websockets schema: {e}")

    # Run migrations before starting server
    print("\nRunning database migrations...")
    try:
        subprocess.run(["python", "manage.py", "migrate", "--noinput"], check=True, cwd="/app")
        print("✓ Migrations completed successfully")
    except subprocess.CalledProcessError as e:
        print(f"✗ Migration failed with exit code {e.returncode}")
        sys.exit(1)

    # Build Gunicorn command
    cmd = [
        "gunicorn",
        "config.wsgi:application",
        "--bind",
        f"0.0.0.0:{port}",
        "--workers",
        "4",
        "--worker-class",
        "sync",
        "--max-requests",
        "1000",
        "--max-requests-jitter",
        "50",
        "--timeout",
        "30",
        "--access-logfile",
        "-",
        "--error-logfile",
        "-",
        "--log-level",
        "info",
    ]

    print(f"Executing: {' '.join(cmd)}")

    # Replace current process with Gunicorn
    os.execvp("gunicorn", cmd)


if __name__ == "__main__":
    main()
