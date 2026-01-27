#!/usr/bin/env bash
set -euo pipefail

# Ensure tests don't accidentally run with local settings.
unset DJANGO_SETTINGS_MODULE
export DJANGO_SETTINGS_MODULE=config.settings.test
export PYTHONDONTWRITEBYTECODE=1

python -m pytest "$@"
