#!/bin/bash
# Entrypoint script for demo profile with auto-seed
# 032-demo-production-database (WP03)
#
# Purpose: Initialize database and optionally seed demo data
# Usage: Called automatically by docker-compose.demo.yml

set -e  # Exit on any error

echo "=== Django Core Demo Entrypoint ==="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "DEMO_AUTO_SEED: ${DEMO_AUTO_SEED:-false}"
echo "DEMO_RESET_ON_START: ${DEMO_RESET_ON_START:-false}"
echo "DEMO_RANDOM_SEED: ${DEMO_RANDOM_SEED:-default}"

# Wait for database to be ready (healthcheck should handle this, but double-check)
echo ""
echo "Waiting for database connection..."
python << END
import sys
import time
import os
from django.db import connections
from django.db.utils import OperationalError

max_retries = 30
retry_interval = 1

for attempt in range(max_retries):
    try:
        conn = connections['default']
        conn.cursor()
        print(f"✓ Database connection established (attempt {attempt + 1}/{max_retries})")
        sys.exit(0)
    except OperationalError as e:
        if attempt < max_retries - 1:
            print(f"  Waiting for database... (attempt {attempt + 1}/{max_retries})")
            time.sleep(retry_interval)
        else:
            print(f"✗ Database connection failed after {max_retries} attempts")
            print(f"  Error: {e}")
            sys.exit(1)
END

# Run migrations
echo ""
echo "Running database migrations..."
python manage.py migrate --noinput

# Handle reset if requested (DANGEROUS - only for testing)
if [ "${DEMO_RESET_ON_START}" = "true" ]; then
    echo ""
    echo "⚠️  DEMO_RESET_ON_START=true detected - Wiping demo data..."
    python manage.py reset_demo_data --force --json || {
        echo "✗ Reset failed (continuing anyway)"
    }
fi

# Handle auto-seed if enabled
if [ "${DEMO_AUTO_SEED}" = "true" ]; then
    echo ""
    echo "DEMO_AUTO_SEED enabled - Seeding demo data..."

    # Set DEMO_RANDOM_SEED environment variable if specified
    if [ -n "${DEMO_RANDOM_SEED}" ] && [ "${DEMO_RANDOM_SEED}" != "default" ]; then
        export DEMO_RANDOM_SEED="${DEMO_RANDOM_SEED}"
        echo "Using DEMO_RANDOM_SEED=${DEMO_RANDOM_SEED}"
    fi

    # Run seed command with JSON output for structured logging
    if python manage.py seed_demo_data --json 2>/dev/null; then
        echo "✓ Demo data seeded successfully"
    else
        echo "⚠️  Seed command failed or data already exists (continuing anyway)"
    fi

    # Validate seeded data
    echo ""
    echo "Validating demo data integrity..."
    if python manage.py validate_demo_data --json 2>/dev/null; then
        echo "✓ Demo data validation passed"
    else
        echo "⚠️  Demo data validation failed (check logs)"
    fi
fi

# Collect static files (required for production-like setup)
echo ""
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo ""
echo "=== Demo Environment Ready ==="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""
echo "Demo accounts:"
echo "  - admin@demo.djangocore.app (Admin, password: Demo2024!)"
echo "  - manager@demo.djangocore.app (Manager, password: Demo2024!)"
echo "  - user@demo.djangocore.app (User, password: Demo2024!)"
echo ""
echo "Access the application at: http://localhost:8080"
echo ""

# Execute the main command (passed as arguments to this script)
exec "$@"
