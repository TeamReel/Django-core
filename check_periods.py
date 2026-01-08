#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, "src")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
django.setup()

from organisations.models import Organisation, Period

knvb = Organisation.objects.get(slug="knvb")
periods = Period.objects.filter(organisation=knvb).order_by("-start_date")

print("\n=== KNVB Periods (seizoenen) ===")
for period in periods[:10]:  # Laatste 10 seizoenen
    print(f"  {period.name} ({period.start_date} - {period.end_date})")
