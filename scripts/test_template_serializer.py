#!/usr/bin/env python
"""Test script to verify ContentTemplate serializer output."""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "src.settings")
django.setup()

from src.content_generation.models import ContentTemplate
from src.content_generation.serializers import ContentTemplateSerializer

# Get the template
t = ContentTemplate.objects.select_related("sport", "formation", "organisation").get(id=5)
serializer = ContentTemplateSerializer(t)
data = serializer.data

print("=== Serialized Template ===")
print(f"Name: {data['name']}")
print(f"Type: {data['template_type']}")
print(f"Subtype: {data['template_subtype']}")
print(f"Organisation: {data['organisation']}")
print(f"Sport Detail: {data['sport_detail']}")
print(f"Formation Detail: {data['formation_detail']}")
print(f"Style Variant: {data['style_variant']}")
print()
print("=== Input Requirements Summary ===")
reqs = data["input_requirements"]
if "players" in reqs:
    print(f"Players: {len(reqs['players'].get('positions', []))} positions")
    print(f"  Required assets per player: {len(reqs['players'].get('required_assets', []))}")
if "staff" in reqs:
    print(f"Staff members: {len(reqs['staff'].get('members', []))}")
if "output" in reqs:
    dims = reqs["output"].get("dimensions", {})
    print(f"Output: {dims.get('aspect_ratio')} {reqs['output'].get('duration_seconds')}s")
