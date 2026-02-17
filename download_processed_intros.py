import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
import django

# Setup path
src_dir = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(src_dir))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from projects.models import ProjectMembership

BASE_URL = "https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/"

def main():
    target_dir = Path("repro_lineup/ajax_processed")
    target_dir.mkdir(parents=True, exist_ok=True)

    print("Finding memberships for Ajax 1 (Project ID 93)...")
    memberships = ProjectMembership.objects.filter(project_id=93)

    count = 0
    for pm in memberships:
        assets = pm.metadata.get("teamreel_assets", {})
        videos = assets.get("videos", {})
        intro = videos.get("intro", {})

        for key, val in intro.items():
            if isinstance(val, dict) and val.get("processed"):
                rel_path = val.get("processed")
                # Remove leading slash if present to avoid absolute path confusion
                rel_path_clean = rel_path.lstrip("/")
                full_url = f"{BASE_URL}{rel_path_clean}"

                ext = Path(rel_path).suffix
                filename = f"{pm.id}_{key}{ext}"
                local_path = target_dir / filename

                print(f"Downloading {filename}...")
                try:
                    with urllib.request.urlopen(full_url, timeout=30) as r:
                         with open(local_path, "wb") as f:
                             f.write(r.read())
                    count += 1
                except Exception as e:
                    print(f"Failed {filename}: {e}")

    print(f"Done. Downloaded {count} files.")

if __name__ == "__main__":
    main()
