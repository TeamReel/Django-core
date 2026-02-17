import os
import sys
from pathlib import Path
import django
from django.conf import settings

# Add src/ directory to Python path
src_dir = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(src_dir))

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from projects.models import ProjectMembership
from uuid import UUID

def inspect_metadata(user_id_str):
    with open("metadata_dump.txt", "w") as f:
        try:
            # Find membership for this user.
            # Since user_id is unique per project, we might find multiple if they are in multiple projects.
            # But let's just find one for now or filter by the Ajax project if possible.
            # The user said "Ajax 1", so let's look for memberships associated with that team/project.

            # The user provided ID is confusingly named 'user_id_str' in this context
            # Let's try to match it against 'memberships' primary key.
            memberships = ProjectMembership.objects.filter(id=user_id_str)

            f.write(f"Found {memberships.count()} memberships for user {user_id_str}\n")
            print(f"Found {memberships.count()} memberships for user {user_id_str}")

            for pm in memberships:
                f.write(f"\n--- Membership ID: {pm.id} ---\n")
                f.write(f"Project: {pm.project.name} (ID: {pm.project.id})\n")

                assets = pm.metadata.get("teamreel_assets", {})
                videos = assets.get("videos", {})
                intro = videos.get("intro", {})

                f.write(f"Intro variants keys: {list(intro.keys())}\n")

                for key, val in intro.items():
                    f.write(f"\nVariant: {key}\n")
                    f.write(f"Value type: {type(val)}\n")
                    f.write(f"Value: {val}\n")

        except Exception as e:
            f.write(f"Error: {e}\n")
            print(f"Error: {e}")


if __name__ == "__main__":
    inspect_metadata("a64e0cde-4cb5-400d-9677-eef2d7d26511")
