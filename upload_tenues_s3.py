"""
Upload tenue images to S3 for existing BrandAsset records.

Prerequisites:
  $env:AWS_ACCESS_KEY_ID = "..."
  $env:AWS_SECRET_ACCESS_KEY = "..."

Usage:
  python upload_tenues_s3.py
"""
import os
import sys
import mimetypes
from pathlib import Path

BUCKET = os.environ.get("AWS_S3_BUCKET_NAME", "teamreel-assets-demo")
REGION = "eu-north-1"

# S3 paths matching the DB records created by seed_tenues.py
UPLOADS = {
    "ajax": "brands/ajax/kits/home.jpg",
    "psv": "brands/psv/kits/home.jpg",
    "feyenoord": "brands/feyenoord/kits/home.jpg",
}


def main():
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    if not access_key or not secret_key:
        print("❌ Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY first")
        sys.exit(1)

    import boto3
    s3 = boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=REGION,
    )

    base = Path(__file__).parent
    for slug, s3_key in UPLOADS.items():
        # Find local image
        file_path = None
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            p = base / f"{slug}{ext}"
            if p.exists():
                file_path = p
                break

        if not file_path:
            print(f"⏭️  {slug}: no local image found")
            continue

        mime_type = mimetypes.guess_type(str(file_path))[0] or "image/jpeg"
        print(f"📤 Uploading {file_path.name} → s3://{BUCKET}/{s3_key} ({mime_type})")
        s3.upload_file(
            str(file_path),
            BUCKET,
            s3_key,
            ExtraArgs={"ContentType": mime_type, "CacheControl": "max-age=31536000"},
        )
        print(f"   ✅ Done")

    print("\n✅ All uploads complete!")


if __name__ == "__main__":
    main()
