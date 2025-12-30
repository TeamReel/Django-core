#!/usr/bin/env python
"""Production startup script for Railway deployment."""
import os
import subprocess
import sys


def main():
    """Start Gunicorn with Railway PORT."""
    port = os.environ.get("PORT", "8080")

    print(f"Starting Django Core-App on port {port}...")
    print(f"DJANGO_SETTINGS_MODULE: {os.environ.get('DJANGO_SETTINGS_MODULE', 'NOT SET')}")

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
