#!/bin/bash
#
# Validates example code by running TypeScript type-check, lint, and build.
#
# This script validates the @django-core/integration-guides-examples package
# by running TypeScript type checking, ESLint, and the build process. All checks
# must pass for the script to succeed.
#
# Exit codes:
#   0 - All validations passed
#   1 - One or more validations failed
#
# Requires: pnpm
#

set -e  # Exit on first error (we'll catch it and report)

echo "Validating @django-core/integration-guides-examples"
echo ""

# Track success/failure
FAILED=0

# Step 1: Type-check
echo "1. Running TypeScript type-check..."
TYPE_CHECK_START=$(date +%s%N)
if ! pnpm --filter @django-core/integration-guides-examples type-check; then
    echo "[FAIL] Type-check failed"
    FAILED=1
else
    TYPE_CHECK_END=$(date +%s%N)
    TYPE_CHECK_TIME=$(echo "scale=2; ($TYPE_CHECK_END - $TYPE_CHECK_START) / 1000000000" | bc)
    echo "[PASS] Type-check passed (${TYPE_CHECK_TIME}s)"
fi
echo ""

# Step 2: Lint
echo "2. Running ESLint..."
LINT_START=$(date +%s%N)
if ! pnpm --filter @django-core/integration-guides-examples lint; then
    echo "[FAIL] Lint failed"
    FAILED=1
else
    LINT_END=$(date +%s%N)
    LINT_TIME=$(echo "scale=2; ($LINT_END - $LINT_START) / 1000000000" | bc)
    echo "[PASS] Lint passed (${LINT_TIME}s)"
fi
echo ""

# Summary
echo "================================================================"
if [ $FAILED -eq 1 ]; then
    echo "[FAIL] Validation FAILED"
    echo ""
    echo "Troubleshooting tips:"
    echo "- Type errors? Check docs/integration-guides/troubleshooting.md"
    echo "- Lint errors? Run: pnpm --filter @django-core/integration-guides-examples lint --fix"
    echo ""
    exit 1
else
    echo "[PASS] All validations PASSED"
    echo ""
    echo "Ready to commit! Examples are valid and ready for PR."
    exit 0
fi
