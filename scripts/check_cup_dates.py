import os
import django
import sys
from datetime import datetime

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from activities.models import Activity


def check_cup_dates():
    # Get recent activities to see if cup matches are in the first 50
    recent_activities = Activity.objects.all().order_by("-start_time")[:50]

    print("\n--- Recent 50 Activities Analysis ---")
    cup_in_recent = 0
    league_in_recent = 0
    other_in_recent = 0

    for a in recent_activities:
        period_name = a.period.name if a.period else "None"
        is_cup = "cup" in period_name.lower()
        is_league = "league" in period_name.lower() or "competitie" in period_name.lower()

        if is_cup:
            cup_in_recent += 1
            print(f"CUP MATCH FOUND: {a.title} ({a.start_time})")
        elif is_league:
            league_in_recent += 1
        else:
            other_in_recent += 1

    print(f"\nSummary of top 50 recent activities:")
    print(f"Cup: {cup_in_recent}")
    print(f"League: {league_in_recent}")
    print(f"Other: {other_in_recent}")

    # If no cup matches in recent, find when the last one was
    if cup_in_recent == 0:
        last_cup = (
            Activity.objects.filter(period__name__icontains="cup").order_by("-start_time").first()
        )
        if last_cup:
            print(f"\nMost recent cup match is actually at: {last_cup.start_time}")
            print(
                f"Total Cup matches: {Activity.objects.filter(period__name__icontains='cup').count()}"
            )
        else:
            print("\nNo Cup matches found in DB at all.")


if __name__ == "__main__":
    check_cup_dates()
