#!/usr/bin/env python
"""Debug script to inspect router URLs."""
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "src.config.settings")

# Use Django's setup from manage.py
import sys
from django.core.management import execute_from_command_line

# Setup Django
django.setup()

# Now import after setup
from src.workflows.urls import router

print("DRF Router URLs for Workflows:")
print("=" * 80)
for pattern in router.urls:
    print(f"{pattern.pattern:60} - {pattern.name}")
print("=" * 80)
print(f"Total routes: {len(router.urls)}")
