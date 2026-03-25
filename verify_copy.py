"""Verify the copy results - check a few memberships."""
import os, django, requests
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
os.environ["DATABASE_URL"] = "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
django.setup()

from projects.models import ProjectMembership

bucket = "teamreel-assets-demo"
region = "eu-north-1"

# Check Harold specifically
harold = ProjectMembership.objects.get(id="e1961bdf-ef58-49ae-9618-29e6820d09d5")
tr = harold.metadata.get("teamreel_assets", {})
legacy_url = tr.get("media", {}).get("legacy_photo", {}).get("url", "")
print(f"Harold legacy_photo.url: {legacy_url}")

# Test public access
url = f"https://{bucket}.s3.{region}.amazonaws.com/{legacy_url.replace(' ', '%20')}"
r = requests.head(url, timeout=5)
print(f"HTTP {r.status_code} for {url[:80]}")

# Count how many still have uploads/ prefix
still_uploads = 0
now_members = 0
for m in ProjectMembership.objects.all().iterator():
    meta = m.metadata or {}
    tr_a = meta.get("teamreel_assets", {})
    lp = tr_a.get("media", {}).get("legacy_photo", {}).get("url", "")
    if lp.startswith("uploads/"):
        still_uploads += 1
    elif lp.startswith("members/"):
        now_members += 1

print(f"\nStill uploads/: {still_uploads}")
print(f"Now members/: {now_members}")
