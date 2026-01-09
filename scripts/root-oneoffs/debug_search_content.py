import os
import django
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from projects.models import Project
from search.models import SearchEntry
from search.backend.postgres import PostgresSearchBackend
from django.contrib.auth import get_user_model

User = get_user_model()


def debug_search():
    print("--- Debugging Search Content for 'liverpool' ---")

    # 1. Check Project
    print("\n1. Checking Project model:")
    projects = Project.objects.filter(name__icontains="liverpool")
    if projects.exists():
        for p in projects:
            print(f"   Found Project: '{p.name}' (ID: {p.id}, Org: {p.organisation.slug})")
    else:
        print("   No Project found with name containing 'liverpool'")

    # 2. Check SearchEntry
    print("\n2. Checking SearchEntry model:")
    entries = SearchEntry.objects.filter(body_text__icontains="liverpool")
    if entries.exists():
        for e in entries:
            print(
                f"   Found SearchEntry: '{e.title}' (Type: {e.content_type.model}, ID: {e.object_id})"
            )
            print(f"   Body Text snippet: {e.body_text[:100]}...")
    else:
        print("   No SearchEntry found with body_text containing 'liverpool'")

    # 3. Test Search Backend
    print("\n3. Testing PostgresSearchBackend:")
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        print("   No superuser found to test search.")
        return

    print(f"   Testing search as user: {user.email} (Superuser)")
    backend = PostgresSearchBackend()
    results = backend.search("liverpool", user)

    print(f"   Backend returned {results.count()} results.")

    # 4. Test Permission Filtering Logic
    print("\n4. Testing Permission Logic:")
    from search.registry import search_registry
    from search.indexes import ProjectIndex

    # Manually check visible IDs for Project
    index = ProjectIndex()
    visible_ids = index.get_visible_ids(user)
    print(f"   Visible Project IDs (first 5): {list(visible_ids)[:5]}")

    # Check if '62' is in visible_ids
    if "62" in visible_ids:
        print("   ID '62' IS in visible_ids")
    else:
        print("   ID '62' is NOT in visible_ids")

    # Check SearchEntry for '62'
    entry_62 = SearchEntry.objects.filter(object_id="62", content_type__model="project").first()
    if entry_62:
        print(f"   SearchEntry for '62' exists. ContentType: {entry_62.content_type}")
    else:
        print("   SearchEntry for '62' does NOT exist.")


if __name__ == "__main__":
    debug_search()
