#!/usr/bin/env python
"""
SoccerWiki Import Script for TeamReel.

Downloads club logos and player photos from SoccerWiki CDN and uploads to AWS S3.

Usage:
    python scripts/import_soccerwiki.py --json-path path/to/soccerwiki.json

Environment Variables Required:
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_S3_BUCKET_NAME (optional, defaults to 'teamreel-assets-demo')
    AWS_S3_REGION (optional, defaults to 'eu-north-1')
"""

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests


@dataclass
class ImportStats:
    """Track import statistics."""

    clubs_found: int = 0
    clubs_downloaded: int = 0
    clubs_failed: int = 0
    players_found: int = 0
    players_downloaded: int = 0
    players_failed: int = 0
    players_skipped_no_image: int = 0


class SoccerWikiImporter:
    """
    Import SoccerWiki data to AWS S3.

    Handles downloading images from SoccerWiki CDN and uploading to S3.
    """

    # Club IDs for Ajax, PSV, Feyenoord (phase 1)
    TARGET_CLUB_IDS = {180, 201, 192}  # Ajax, PSV, Feyenoord

    # SoccerWiki CDN base URLs
    PLAYER_IMAGE_BASE = "https://cdn.soccerwiki.org/images/player/"
    CLUB_IMAGE_BASE = "https://cdn.soccerwiki.org/images/logos/clubs/"

    def __init__(
        self,
        access_key: str,
        secret_key: str,
        bucket_name: str = "teamreel-assets-demo",
        region: str = "eu-north-1",
    ):
        """
        Initialize the importer with AWS credentials.

        Args:
            access_key: AWS Access Key ID
            secret_key: AWS Secret Access Key
            bucket_name: S3 bucket name
            region: AWS region
        """
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket_name = bucket_name
        self.region = region
        self.stats = ImportStats()
        self._s3_client = None
        self._session = requests.Session()
        self._session.headers.update(
            {
                "User-Agent": "TeamReel/1.0 (https://teamreel.nl)",
                "Accept": "image/png,image/jpeg,image/*",
            }
        )

    def _get_s3_client(self):
        """Lazy-load S3 client."""
        if self._s3_client is None:
            import boto3
            from botocore.config import Config

            self._s3_client = boto3.client(
                "s3",
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
                config=Config(signature_version="s3v4"),
            )

        return self._s3_client

    def get_public_url(self, path: str) -> str:
        """Get public URL for uploaded object."""
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{path}"

    def load_json(self, json_path: str) -> dict[str, Any]:
        """Load SoccerWiki JSON file."""
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def download_image(self, url: str) -> bytes | None:
        """
        Download image from URL.

        Args:
            url: Image URL to download

        Returns:
            Image bytes or None if failed
        """
        if not url:
            return None

        try:
            response = self._session.get(url, timeout=30)
            response.raise_for_status()

            # Verify it's actually an image
            content_type = response.headers.get("content-type", "")
            if "image" not in content_type:
                print(f"  ⚠️  Not an image: {url} (content-type: {content_type})")
                return None

            return response.content

        except requests.exceptions.RequestException as e:
            print(f"  ❌ Download failed: {url} - {e}")
            return None

    def upload_to_s3(self, path: str, data: bytes, content_type: str = None) -> str:
        """
        Upload bytes to S3.

        Args:
            path: The object key
            data: Raw bytes to upload
            content_type: Optional content type

        Returns:
            Public URL of uploaded object
        """
        s3 = self._get_s3_client()

        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        s3.put_object(
            Bucket=self.bucket_name,
            Key=path,
            Body=data,
            **extra_args,
        )

        return self.get_public_url(path)

    def import_club_logos(self, clubs: list[dict]) -> list[dict]:
        """
        Import all Dutch club logos.

        Args:
            clubs: List of club data from SoccerWiki JSON

        Returns:
            List of uploaded club data with S3 URLs
        """
        print("\n📦 Importing Club Logos...")
        print(f"   Found {len(clubs)} clubs in JSON")

        self.stats.clubs_found = len(clubs)
        uploaded_clubs = []

        for i, club in enumerate(clubs):
            club_id = club.get("ID")
            name = club.get("Name", "Unknown")
            image_url = club.get("ImageURL", "")

            print(f"\n[{i + 1}/{len(clubs)}] {name} (ID: {club_id})")

            if not image_url:
                print("  ⏭️  No image URL, skipping")
                self.stats.clubs_failed += 1
                continue

            # Download image
            image_data = self.download_image(image_url)
            if not image_data:
                self.stats.clubs_failed += 1
                continue

            # Determine file extension from URL
            ext = Path(urlparse(image_url).path).suffix or ".png"
            blob_path = f"logos/clubs/{club_id}{ext}"

            # Upload to S3
            try:
                content_type = f"image/{ext[1:]}" if ext else "image/png"
                s3_url = self.upload_to_s3(blob_path, image_data, content_type)
                print(f"  ✅ Uploaded: {s3_url}")

                uploaded_clubs.append(
                    {
                        "id": club_id,
                        "name": name,
                        "short_name": club.get("ShortName", ""),
                        "original_url": image_url,
                        "s3_url": s3_url,
                        "blob_path": blob_path,
                    }
                )
                self.stats.clubs_downloaded += 1

            except Exception as e:
                print(f"  ❌ Upload failed: {e}")
                self.stats.clubs_failed += 1

            # Rate limiting - be nice to SoccerWiki CDN
            time.sleep(0.2)

        return uploaded_clubs

    def import_player_photos(
        self, players: list[dict], club_ids: set[int] = None
    ) -> list[dict]:
        """
        Import player photos for specified clubs.

        Args:
            players: List of player data from SoccerWiki JSON
            club_ids: Set of club IDs to import (default: Ajax, PSV, Feyenoord)

        Returns:
            List of uploaded player data with S3 URLs
        """
        if club_ids is None:
            club_ids = self.TARGET_CLUB_IDS

        print(f"\n👤 Importing Player Photos...")

        uploaded_players = []

        # Filter players with images
        players_with_images = [p for p in players if p.get("ImageURL")]
        players_without_images = len(players) - len(players_with_images)

        print(f"   Found {len(players)} players total")
        print(f"   {len(players_with_images)} have images")
        print(f"   {players_without_images} without images (skipped)")

        self.stats.players_found = len(players)
        self.stats.players_skipped_no_image = players_without_images

        for i, player in enumerate(players_with_images):
            player_id = player.get("ID")
            forename = player.get("Forename", "")
            surname = player.get("Surname", "")
            full_name = f"{forename} {surname}".strip()
            image_url = player.get("ImageURL", "")

            # Progress indicator every 50 players
            if (i + 1) % 50 == 0 or i == 0:
                print(f"\n[{i + 1}/{len(players_with_images)}] Processing {full_name}...")

            # Download image
            image_data = self.download_image(image_url)
            if not image_data:
                self.stats.players_failed += 1
                continue

            # Determine file extension
            ext = Path(urlparse(image_url).path).suffix or ".png"
            blob_path = f"players/{player_id}{ext}"

            # Upload to S3
            try:
                content_type = f"image/{ext[1:]}" if ext else "image/png"
                s3_url = self.upload_to_s3(blob_path, image_data, content_type)

                uploaded_players.append(
                    {
                        "id": player_id,
                        "name": full_name,
                        "original_url": image_url,
                        "s3_url": s3_url,
                        "blob_path": blob_path,
                    }
                )
                self.stats.players_downloaded += 1

            except Exception as e:
                print(f"  ❌ Upload failed for {full_name}: {e}")
                self.stats.players_failed += 1

            # Rate limiting
            time.sleep(0.1)

        return uploaded_players

    def print_stats(self):
        """Print import statistics."""
        print("\n" + "=" * 50)
        print("📊 IMPORT STATISTICS")
        print("=" * 50)
        print(f"\n🏟️  CLUBS:")
        print(f"   Found:      {self.stats.clubs_found}")
        print(f"   Downloaded: {self.stats.clubs_downloaded}")
        print(f"   Failed:     {self.stats.clubs_failed}")
        print(f"\n👤 PLAYERS:")
        print(f"   Found:      {self.stats.players_found}")
        print(f"   Downloaded: {self.stats.players_downloaded}")
        print(f"   Failed:     {self.stats.players_failed}")
        print(f"   No Image:   {self.stats.players_skipped_no_image}")
        print("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="Import SoccerWiki data to AWS S3"
    )
    parser.add_argument(
        "--json-path",
        required=True,
        help="Path to SoccerWiki JSON file",
    )
    parser.add_argument(
        "--clubs-only",
        action="store_true",
        help="Only import club logos, skip player photos",
    )
    parser.add_argument(
        "--players-only",
        action="store_true",
        help="Only import player photos, skip club logos",
    )
    parser.add_argument(
        "--max-players",
        type=int,
        default=None,
        help="Maximum number of players to import (for testing)",
    )
    parser.add_argument(
        "--output",
        default="import_results.json",
        help="Output JSON file with results",
    )

    args = parser.parse_args()

    # Check environment variables
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    bucket_name = os.environ.get("AWS_S3_BUCKET_NAME", "teamreel-assets-demo")
    region = os.environ.get("AWS_S3_REGION", "eu-north-1")

    if not access_key or not secret_key:
        print("❌ Error: AWS credentials not set!")
        print("\nRequired environment variables:")
        print("  AWS_ACCESS_KEY_ID")
        print("  AWS_SECRET_ACCESS_KEY")
        print("\nOptional:")
        print("  AWS_S3_BUCKET_NAME (default: teamreel-assets-demo)")
        print("  AWS_S3_REGION (default: eu-north-1)")
        sys.exit(1)

    print("🚀 SoccerWiki → AWS S3 Import")
    print("=" * 50)
    print(f"Bucket:    {bucket_name}")
    print(f"Region:    {region}")
    print(f"JSON:      {args.json_path}")
    print("=" * 50)

    # Initialize importer
    importer = SoccerWikiImporter(access_key, secret_key, bucket_name, region)

    # Load JSON
    print("\n📂 Loading SoccerWiki JSON...")
    data = importer.load_json(args.json_path)

    clubs = data.get("ClubData", [])
    players = data.get("PlayerData", [])

    print(f"   Loaded {len(clubs)} clubs and {len(players)} players")

    results = {"clubs": [], "players": []}

    # Import clubs
    if not args.players_only:
        results["clubs"] = importer.import_club_logos(clubs)

    # Import players
    if not args.clubs_only:
        player_list = players
        if args.max_players:
            player_list = players[: args.max_players]
        results["players"] = importer.import_player_photos(player_list)

    # Save results
    output_path = Path(args.output)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Results saved to: {output_path}")

    # Print stats
    importer.print_stats()

    print("\n✅ Import complete!")


if __name__ == "__main__":
    main()
