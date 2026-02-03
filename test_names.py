#!/usr/bin/env python
"""Test Django app name validation"""
from django.core.management.utils import validate_name

names = ['assets', 'media', 'dam', 'assetlib', 'smart_assets', 'b35_assets', 'medialib35', 'assetmgr']

for name in names:
    try:
        validate_name(name, 'app')
        print(f"✓ {name}: OK")
    except Exception as e:
        print(f"✗ {name}: {e}")
