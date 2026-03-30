import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from organisations.models import Organisation


def check_fed_orgs():
    slugs = ["knvb", "dfb", "the-fa", "figc", "rfef", "fff"]
    orgs = Organisation.objects.filter(slug__in=slugs)

    print("\n--- Federation Organisations ---")
    if not orgs:
        print("No matches found for slugs:", slugs)

    for o in orgs:
        print(f"Name: {o.name}, Slug: {o.slug}")


if __name__ == "__main__":
    check_fed_orgs()
