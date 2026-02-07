"""
Seed Home Kit (Tenue) BrandAssets for Ajax, PSV, and Feyenoord.

Usage:
  1. Set environment variables:
     $env:AWS_ACCESS_KEY_ID = "..."
     $env:AWS_SECRET_ACCESS_KEY = "..."
     $env:DATABASE_URL = "postgresql://postgres:...@switchback.proxy.rlwy.net:17304/railway"

  2. Place tenue images in workspace root:
     - ajax.jpg   (or ajax.png)
     - psv.jpg    (or psv.png)
     - feyenoord.jpg (or feyenoord.png)

  3. Run:
     python seed_tenues.py

Idempotent: uses update_or_create for all records.
"""
import os
import sys
import uuid
import mimetypes
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

# ── Configuration ──────────────────────────────────────────────────────
BUCKET = os.environ.get("AWS_S3_BUCKET_NAME", "teamreel-assets-demo")
REGION = "eu-north-1"
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Club configs: slug → brand_profile_id, org_id
CLUBS = {
    "ajax": {
        "brand_profile_id": "010049c2-0927-40d7-ad8c-de97e4e08c9e",
        "org_id": "80941138-a06d-49a9-819c-12d05745841a",
        "alt": "Ajax Home Kit",
    },
    "psv": {
        "brand_profile_id": "abe0820e-7862-4de7-ab46-e708f8e464df",
        "org_id": "80941138-a06d-49a9-819c-12d05745841a",
        "alt": "PSV Home Kit",
    },
    "feyenoord": {
        "brand_profile_id": "080da62a-6a82-4eb3-8c92-5f1434a626d5",
        "org_id": "80941138-a06d-49a9-819c-12d05745841a",
        "alt": "Feyenoord Home Kit",
    },
}

ASSET_TYPE = "kit_home_upload"


def find_image(slug: str) -> Path | None:
    """Find a tenue image for the given club slug."""
    base = Path(__file__).parent
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = base / f"{slug}{ext}"
        if p.exists():
            return p
    return None


def upload_to_s3(file_path: Path, s3_key: str) -> bool:
    """Upload file to S3. Returns True on success."""
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    if not access_key or not secret_key:
        print(f"  ⚠️  No AWS credentials — skipping S3 upload for {s3_key}")
        return False

    import boto3
    s3 = boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=REGION,
    )
    mime_type = mimetypes.guess_type(str(file_path))[0] or "image/jpeg"
    s3.upload_file(
        str(file_path),
        BUCKET,
        s3_key,
        ExtraArgs={"ContentType": mime_type, "CacheControl": "max-age=31536000"},
    )
    print(f"  ✅ Uploaded to s3://{BUCKET}/{s3_key}")
    return True


def seed_club(cur, slug: str, config: dict, file_path: Path | None) -> None:
    """Create/update FileAsset + BrandAsset for one club's home kit."""
    profile_id = config["brand_profile_id"]
    org_id = config["org_id"]
    alt_text = config["alt"]

    # Check if BrandAsset already exists for this profile + asset_type
    cur.execute(
        """
        SELECT ba.id, ba.file_id, fa.storage_path
        FROM branding_brandasset ba
        JOIN files_fileasset fa ON fa.id = ba.file_id
        WHERE ba.profile_id = %s AND ba.asset_type = %s
        """,
        (profile_id, ASSET_TYPE),
    )
    existing = cur.fetchone()

    if existing:
        print(f"  ℹ️  {slug}: BrandAsset already exists (id={existing['id']}, path={existing['storage_path']})")
        if file_path:
            # Update: upload new image to same S3 path
            s3_key = existing["storage_path"]
            upload_to_s3(file_path, s3_key)
        return

    if not file_path:
        print(f"  ⏭️  {slug}: No local image found, skipping")
        return

    # ── Create FileAsset ──
    file_id = str(uuid.uuid4())
    ext = file_path.suffix.lower()
    mime_type = mimetypes.guess_type(str(file_path))[0] or "image/jpeg"
    file_size = file_path.stat().st_size
    s3_key = f"brands/{slug}/kits/home{ext}"
    original_name = f"{slug}_home_kit{ext}"

    # Upload to S3
    uploaded = upload_to_s3(file_path, s3_key)
    if not uploaded:
        print(f"  ⚠️  {slug}: S3 upload failed — creating DB records with path anyway (fix later)")

    cur.execute(
        """
        INSERT INTO files_fileasset (id, organization_id, original_name, storage_path, file_size, mime_type, is_public, is_deleted, metadata, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, true, false, '{}', NOW(), NOW())
        ON CONFLICT (storage_path) DO UPDATE SET
            file_size = EXCLUDED.file_size,
            mime_type = EXCLUDED.mime_type,
            updated_at = NOW()
        RETURNING id
        """,
        (file_id, org_id, original_name, s3_key, file_size, mime_type),
    )
    result = cur.fetchone()
    actual_file_id = result["id"]
    print(f"  ✅ FileAsset created/updated: {actual_file_id} → {s3_key}")

    # ── Create BrandAsset ──
    brand_asset_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO branding_brandasset (id, profile_id, file_id, asset_type, alt_text, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, true, NOW(), NOW())
        ON CONFLICT ON CONSTRAINT unique_asset_type_per_profile DO UPDATE SET
            file_id = EXCLUDED.file_id,
            alt_text = EXCLUDED.alt_text,
            updated_at = NOW()
        RETURNING id
        """,
        (brand_asset_id, profile_id, actual_file_id, ASSET_TYPE, alt_text),
    )
    result = cur.fetchone()
    print(f"  ✅ BrandAsset created/updated: {result['id']} ({ASSET_TYPE})")


def main():
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set")
        sys.exit(1)

    print(f"🏟️  Seeding tenue assets for {len(CLUBS)} clubs...")
    print(f"   Bucket: {BUCKET}")
    print(f"   DB: {DATABASE_URL[:50]}...")
    print()

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    conn.autocommit = False

    try:
        cur = conn.cursor()
        for slug, config in CLUBS.items():
            file_path = find_image(slug)
            print(f"🔵 {slug.upper()}: {'found ' + str(file_path) if file_path else 'no local image'}")
            seed_club(cur, slug, config, file_path)
            print()

        conn.commit()
        print("✅ All done! Transaction committed.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
