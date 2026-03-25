"""Find all metadata paths containing 'uploads/' references."""
import os, django, json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
os.environ["DATABASE_URL"] = "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
django.setup()

from projects.models import ProjectMembership

def find_upload_paths(obj, path=""):
    """Recursively find all string values containing 'uploads/'."""
    results = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            results.extend(find_upload_paths(v, f"{path}.{k}" if path else k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            results.extend(find_upload_paths(v, f"{path}[{i}]"))
    elif isinstance(obj, str) and "uploads/" in obj:
        results.append((path, obj))
    return results

# Check all memberships
all_paths = {}
for m in ProjectMembership.objects.all().iterator():
    meta = m.metadata or {}
    tr = meta.get("teamreel_assets", {})
    paths = find_upload_paths(tr)
    if paths:
        all_paths[str(m.id)] = paths

print(f"Total memberships with uploads/: {len(all_paths)}")
print()

# Aggregate by metadata path
path_counts = {}
for mid, paths in all_paths.items():
    for p, v in paths:
        path_counts[p] = path_counts.get(p, 0) + 1

print("Metadata paths with uploads/ values:")
for p, count in sorted(path_counts.items(), key=lambda x: -x[1]):
    print(f"  {p}: {count} memberships")

# Show a few examples
print("\nExamples:")
for mid, paths in list(all_paths.items())[:3]:
    print(f"\n  Member {mid}:")
    for p, v in paths:
        print(f"    {p} = {v[:80]}")
