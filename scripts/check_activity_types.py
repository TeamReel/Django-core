import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from activities.models import Activity


def check_activities():
    matches = Activity.objects.filter(activity_type="match")[:20]
    print(f"Found {len(matches)} matches")
    for m in matches:
        p_name = m.period.name if m.period else "None"
        print(f"Match: {m.title} | Type: {m.activity_type} | Period: {p_name}")


if __name__ == "__main__":
    check_activities()
