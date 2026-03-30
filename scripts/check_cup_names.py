import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from activities.models import Activity


def check_cup_names():
    cup_matches = Activity.objects.filter(activity_type="match", period__name__icontains="cup")[:5]
    print(f"Found {len(cup_matches)} cup matches")
    for m in cup_matches:
        print(f"Match: {m.title} | Type: {m.activity_type} | Period: {m.period.name}")


if __name__ == "__main__":
    check_cup_names()
