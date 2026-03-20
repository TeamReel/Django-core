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

    print(f"Starting Django Core-App on port {port}...", flush=True)
    print(f"DJANGO_SETTINGS_MODULE: {os.environ.get('DJANGO_SETTINGS_MODULE', 'NOT SET')}", flush=True)
    print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'NOT SET')}", flush=True)
    print(f"PATH: {os.environ.get('PATH', 'NOT SET')}", flush=True)

    # Pre-flight: verify ASGI app imports correctly before starting gunicorn
    print("\n[Pre-flight] Testing ASGI app import...", flush=True)
    try:
        from config.asgi import application as _app  # noqa: F401
        print(f"[Pre-flight] ASGI app loaded OK: {type(_app).__name__}", flush=True)
    except Exception as e:
        print(f"[Pre-flight] ASGI app import FAILED: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)

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
            # Default is fail-open to avoid taking down the whole API with an endless
            # crashloop (which surfaces as 502s behind the proxy). Set FAIL_ON_MIGRATION_ERROR=1
            # to enforce fail-fast behavior.
            if os.environ.get("FAIL_ON_MIGRATION_ERROR", "0") == "1":
                try:
                    os.kill(os.getpid(), signal.SIGTERM)
                except Exception:
                    pass

    # Build Gunicorn command with UvicornWorker for ASGI support (HTTP + WebSocket)
    # Daphne fails to start on Railway; Gunicorn + UvicornWorker is the proven
    # production pattern for Django Channels deployments.
    cmd = [
        "gunicorn",
        "config.asgi:application",
        "-k", "uvicorn.workers.UvicornWorker",
        "-b", f"0.0.0.0:{port}",
        "--workers", "2",
        "--timeout", "300",
        "--access-logfile", "-",
        "--error-logfile", "-",
        "--log-level", "info",
    ]

    print(f"Executing: {' '.join(cmd)}", flush=True)
    print("NOTE: DB migrations will run in background after server binds\n", flush=True)

    # Start DB tasks in background so health checks can pass quickly
    threading.Thread(target=_run_startup_db_tasks, daemon=True).start()

    # Spawn Gunicorn as child process so this script can run background tasks.
    # Forward termination signals to Gunicorn.
    proc = subprocess.Popen(cmd, cwd="/app", stdout=sys.stdout, stderr=sys.stderr)

    def _terminate(*_args):
        try:
            proc.terminate()
        except Exception:
            pass

    signal.signal(signal.SIGTERM, _terminate)
    signal.signal(signal.SIGINT, _terminate)

    exit_code = proc.wait()
    print(f"Gunicorn exited with code {exit_code}", flush=True)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
