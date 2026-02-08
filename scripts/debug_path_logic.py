
import os
import sys
import uuid
from pathlib import Path

# Setup Django environment
sys.path.insert(0, str(Path.cwd() / "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from projects.models import Project
from files.utils import get_storage_backend

def check_s3_path(prefix):
    print(f"\n--- Checking S3 prefix: {prefix} ---")
    try:
        backend = get_storage_backend()
        client = backend._client
        bucket = backend.bucket_name

        response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        if 'Contents' in response:
            for obj in response['Contents']:
                print(f"FOUND: {obj['Key']}")
        else:
            print("No objects found.")
    except Exception as e:
        print(f"S3 Check Failed: {e}")

def test_path_logic(path_prefix, org_id):
    print(f"\n--- Testing prefix: {path_prefix} (Org: {org_id}) ---")

    parts = path_prefix.split("/")
    identifier = parts[1] if len(parts) >= 2 else None

    if not identifier:
        print("No identifier found")
        return

    print(f"Identifier: {identifier}")

    project = None
    if identifier.isdigit():
        project = Project.objects.filter(id=int(identifier), organisation_id=org_id).first()

    if not project:
        project = Project.objects.filter(slug=identifier, organisation_id=org_id).first()

    if project:
        print(f"Found Project: {project.slug} (ID: {project.id})")

        if project.parent_project:
            club = project.parent_project
            new_prefix = f"clubs/{club.slug}-{club.id}/teams/{project.slug}-{project.id}/logo"
        else:
            new_prefix = f"clubs/{project.slug}-{project.id}/logo"

        print(f"Result Path: {new_prefix}")
    else:
        print("Project NOT found")

# Get Org ID for Ajax
p = Project.objects.filter(slug='ajax').first()
if p:
    org_id = p.organisation_id
    test_path_logic("logos/ajax", org_id)
    test_path_logic("logos/ajax-1", org_id)
    test_path_logic("logos/ajax-ajax", org_id)

    check_s3_path("clubs/ajax-ajax/")
    check_s3_path("clubs/ajax-2/")
else:
    print("Ajax project not found")
