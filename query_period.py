import os
import sys
import django

# Voeg src/ toe aan Python path voor Railway
sys.path.insert(0, "/app/src")

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from periods.models import Period
from activities.models import Activity

period_id = "973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf"

try:
    period = Period.objects.filter(id=period_id).first()
    if period:
        print(f"\n✅ Period EXISTS in database:")
        print(f"   ID: {period.id}")
        print(f"   Name: {period.name}")
        print(f"   Organisation: {period.organisation.name if period.organisation else 'None'}")
        print(f"   Project: {period.project.name if period.project else 'None'}")
    else:
        print(f"\n❌ Period NOT FOUND in database")

    # Count activities referencing this period
    orphaned_count = Activity.objects.filter(period_id=period_id).count()
    print(f"\n📊 Activities referencing this period: {orphaned_count}")

    if orphaned_count > 0 and not period:
        print("\n⚠️  DATA INTEGRITY ISSUE: Activities reference non-existent period!")

except Exception as e:
    print(f"\n❌ Error: {e}")
