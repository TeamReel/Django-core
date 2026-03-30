import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from activities.models import Activity


def check_cup_matches():
    cup_matches = Activity.objects.filter(activity_type="match", period__name__icontains="cup")
    beker_matches = Activity.objects.filter(activity_type="match", period__name__icontains="beker")

    print(f"Cup Matches: {cup_matches.count()}")
    print(f"Beker Matches: {beker_matches.count()}")


if __name__ == "__main__":
    check_cup_matches()
