#!/usr/bin/env python
"""Production startup script for Railway deployment."""
import os
import subprocess
import sys
import threading
import time
import signal


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

    def _run_startup_db_tasks():
        """Run optional DB tasks without blocking web server startup."""
        if os.environ.get("RUN_STARTUP_DB_TASKS", "1") != "1":
            print("Startup DB tasks disabled via RUN_STARTUP_DB_TASKS=0")
            return

        # Give the web server time to bind and start accepting connections
        # Railway healthcheck starts ~10s after deployment, so ensure DB tasks don't interfere
        time.sleep(5)

        # One-time fix: Reset rtc_websockets schema to fix integer→UUID migration
        # DISABLED: Causes crashes when run in background while server is processing requests
        # Should be run manually if needed: railway run python manage.py migrate rtc_websockets --fake-initial
        # print("\n[Startup] Checking for migration compatibility issues...")
        print("\n[Startup] Skipping rtc_websockets reset (run manually if needed)...")

        # Run migrations (non-fatal for liveness; readiness should catch issues)
        print("\n[Startup] Running database migrations...")
        try:
            subprocess.run(["python", "manage.py", "migrate", "--noinput"], check=True, cwd="/app")
            print("✓ Migrations completed successfully")
        except subprocess.CalledProcessError as e:
            print(f"✗ Migration failed with exit code {e.returncode}")
            if os.environ.get("FAIL_ON_MIGRATION_ERROR", "1") == "1":
                # Request termination; main thread forwards to Daphne.
                try:
                    os.kill(os.getpid(), signal.SIGTERM)
                except Exception:
                    pass

    # Build Daphne command FIRST (bind immediately for Railway healthchecks)
    cmd = [
        "daphne",
        "-b",
        "0.0.0.0",
        "-p",
        port,
        "config.asgi:application",
    ]

    print(f"Executing: {' '.join(cmd)}")
    print("NOTE: DB migrations will run in background after server binds\n")

    # Start DB tasks in background so health checks can pass quickly
    threading.Thread(target=_run_startup_db_tasks, daemon=True).start()

    # Rebuild search index (ensure demo data is searchable)
    # NOTE: Disabled for now to prevent DB connection exhaustion on startup
    # Should be run manually via Railway CLI: railway run python manage.py rebuild_search_index
    # print("\nRebuilding search index...")
    # try:
    #     subprocess.run(["python", "manage.py", "rebuild_search_index"], check=True, cwd="/app")
    #     print("✓ Search index rebuilt successfully")
    # except subprocess.CalledProcessError as e:
    #     print(f"Warning: Search index rebuild failed: {e}")
    # Don't exit, app can still run

    # Spawn Daphne as child process so this script can run background tasks.
    # Forward termination signals to Daphne.
    proc = subprocess.Popen(cmd, cwd="/app")

    def _terminate(*_args):
        try:
            proc.terminate()
        except Exception:
            pass

    signal.signal(signal.SIGTERM, _terminate)
    signal.signal(signal.SIGINT, _terminate)

    exit_code = proc.wait()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
