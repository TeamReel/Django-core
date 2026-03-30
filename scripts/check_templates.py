#!/usr/bin/env python
"""Check ContentTemplate data in production."""
import os
import sys

# Setup path first
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set Django settings before any imports
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "src.settings")

# Now setup Django
import django
django.setup()

from src.content_generation.models import ContentTemplate

templates = ContentTemplate.objects.all().select_related("sport", "formation")
print(f"Total templates: {templates.count()}\n")
print("=" * 100)

for t in templates:
    sport_name = t.sport.name if t.sport else "None (Universal)"
    formation_code = t.formation.code if t.formation else "None"
    print(f"ID: {t.id}")
    print(f"  Name: {t.name}")
    print(f"  Type/Subtype: {t.template_type} / {t.template_subtype}")
    print(f"  Sport: {sport_name}")
    print(f"  Formation: {formation_code}")
    print(f"  Style: {t.style_variant or 'None'}")
    print(f"  Active: {t.is_active}")
    print(f"  AI Workflow: {t.ai_workflow_id}")
    print("-" * 100)
