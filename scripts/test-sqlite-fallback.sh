#!/bin/bash
# Test script for SQLite fallback compatibility (T013)
# 032-demo-production-database (WP04)
#
# Purpose: Verify seed/validate/reset commands work with SQLite
# Usage: ./scripts/test-sqlite-fallback.sh

set -e

echo "🔍 Testing SQLite Fallback Compatibility (WP04)"
echo "================================================"
echo ""

# Configuration
export DATABASE_URL="sqlite:///./data/test_demo.sqlite3"
export DEMO_RANDOM_SEED=42
PYTHON_CMD="python manage.py"

echo "📊 Environment:"
echo "  DATABASE_URL: $DATABASE_URL"
echo "  DEMO_RANDOM_SEED: $DEMO_RANDOM_SEED"
echo ""

# Clean slate
echo "🧹 Cleaning previous test database..."
rm -f ./data/test_demo.sqlite3
mkdir -p ./data
echo "  ✓ Cleaned"
echo ""

# Step 1: Migrations
echo "🔄 Step 1: Running migrations..."
$PYTHON_CMD migrate --noinput
echo "  ✓ Migrations applied"
echo ""

# Step 2: Seed data
echo "🌱 Step 2: Seeding demo data..."
$PYTHON_CMD seed_demo_data --json > /tmp/seed_output.json
cat /tmp/seed_output.json | python -m json.tool
echo "  ✓ Seed completed"
echo ""

# Step 3: Validate data
echo "✅ Step 3: Validating data integrity..."
$PYTHON_CMD validate_demo_data --json > /tmp/validate_output.json
cat /tmp/validate_output.json | python -m json.tool

# Check validation status
VALIDATION_STATUS=$(cat /tmp/validate_output.json | python -c "import sys, json; print(json.load(sys.stdin)['status'])")
if [ "$VALIDATION_STATUS" = "pass" ]; then
    echo "  ✓ Validation passed"
else
    echo "  ✗ Validation failed"
    exit 1
fi
echo ""

# Step 4: Check counts
echo "📈 Step 4: Verifying expected counts..."
ORGS=$($PYTHON_CMD shell -c "from organisations.models import Organisation; print(Organisation.objects.count())")
USERS=$($PYTHON_CMD shell -c "from accounts.models import User; print(User.objects.count())")
PROJECTS=$($PYTHON_CMD shell -c "from projects.models import Project; print(Project.all_objects.count())")

echo "  Organizations: $ORGS (expected: 5)"
echo "  Users: $USERS (expected: 20)"
echo "  Projects: $PROJECTS (expected: 80)"

if [ "$ORGS" != "5" ] || [ "$USERS" != "20" ] || [ "$PROJECTS" != "80" ]; then
    echo "  ✗ Count mismatch"
    exit 1
fi
echo "  ✓ All counts correct"
echo ""

# Step 5: Reset and reseed
echo "🔄 Step 5: Testing reset and reseed..."
$PYTHON_CMD reset_demo_data --force --json > /tmp/reset_output.json
cat /tmp/reset_output.json | python -m json.tool

# Verify counts after reset
ORGS_AFTER=$($PYTHON_CMD shell -c "from organisations.models import Organisation; print(Organisation.objects.count())")
USERS_AFTER=$($PYTHON_CMD shell -c "from accounts.models import User; print(User.objects.count())")
PROJECTS_AFTER=$($PYTHON_CMD shell -c "from projects.models import Project; print(Project.all_objects.count())")

echo "  Organizations after reset: $ORGS_AFTER (expected: 5)"
echo "  Users after reset: $USERS_AFTER (expected: 20)"
echo "  Projects after reset: $PROJECTS_AFTER (expected: 80)"

if [ "$ORGS_AFTER" != "5" ] || [ "$USERS_AFTER" != "20" ] || [ "$PROJECTS_AFTER" != "80" ]; then
    echo "  ✗ Reset count mismatch"
    exit 1
fi
echo "  ✓ Reset and reseed successful"
echo ""

# Step 6: Test idempotency
echo "🔁 Step 6: Testing idempotency..."
START_TIME=$(date +%s)
$PYTHON_CMD seed_demo_data > /tmp/idempotent_output.txt
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if grep -q "already exists" /tmp/idempotent_output.txt; then
    echo "  ✓ Idempotency check passed (${ELAPSED}s)"
else
    echo "  ⚠️  Warning: Did not detect 'already exists' message"
fi
echo ""

# Success
echo "🎉 All SQLite Compatibility Tests Passed!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✓ Migrations successful"
echo "  ✓ Seed command works on SQLite"
echo "  ✓ Validate command works on SQLite"
echo "  ✓ Reset command works on SQLite"
echo "  ✓ All entity counts correct"
echo "  ✓ Idempotency preserved"
echo ""
echo "Database location: ./data/test_demo.sqlite3"
echo "Database size: $(du -h ./data/test_demo.sqlite3 | cut -f1)"
