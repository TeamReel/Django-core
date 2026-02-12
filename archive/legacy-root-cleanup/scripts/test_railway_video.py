"""Test MiniMax video generation via the RAILWAY production API.

This simulates exactly what the frontend does:
1. POST /api/v1/generative/assets/generate/ with template_id + person_photo URL
2. Wait for synchronous response (up to 5 min)
3. Show result (video_url or error)

Usage:
    python test_railway_video.py

Prerequisites:
    - Railway backend deployed with MINIMAX_API_KEY + MINIMAX_GROUP_ID
    - A player-in-tenue image already on S3
"""

import json
import os
import sys
import time

import requests

# =============================================================================
# Config
# =============================================================================

API_BASE = "https://api.teamreel.app"
# API_BASE = "http://localhost:8000"  # Uncomment for local testing

# Organisation & project IDs (from production data)
# You can find these in the admin or via API
ORGANISATION_ID = ""  # Will be auto-detected
PROJECT_ID = ""  # Will be auto-detected


def get_csrf_and_session():
    """Get CSRF token from the API."""
    session = requests.Session()
    # Try to get CSRF token
    resp = session.get(f"{API_BASE}/api/v1/", timeout=10)
    csrf = session.cookies.get("csrftoken", "")
    return session, csrf


def find_member_with_tenue(session: requests.Session):
    """Find a member that already has a player-in-tenue image."""
    # First get projects
    resp = session.get(f"{API_BASE}/api/v1/projects/", timeout=30)
    resp.raise_for_status()
    projects = resp.json().get("data") or resp.json().get("results") or resp.json()
    if isinstance(projects, dict):
        projects = projects.get("results", [])

    print(f"Found {len(projects)} projects")

    for project in projects:
        pid = project.get("id")
        org_id = project.get("organisation") or project.get("organisation_id")
        name = project.get("name", "?")
        print(f"  Project: {name} (id={pid}, org={org_id})")

        # Get members
        try:
            resp = session.get(f"{API_BASE}/api/v1/projects/{pid}/members/", timeout=30)
            resp.raise_for_status()
            members_data = resp.json().get("data") or resp.json().get("results") or resp.json()
            if isinstance(members_data, dict):
                members = members_data.get("results", [])
            else:
                members = members_data
        except Exception as e:
            print(f"    Error getting members: {e}")
            continue

        for member in members[:10]:  # Check first 10
            mid = member.get("id")
            meta = member.get("metadata") or {}
            media = meta.get("media_assets") or {}
            kit_url = media.get("kit", {}).get("url") if isinstance(media.get("kit"), dict) else None

            if kit_url:
                user_name = ""
                user = member.get("user") or {}
                if isinstance(user, dict):
                    user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()

                print(f"    ✅ Member {mid}: {user_name} has player-in-tenue: {kit_url[:80]}...")
                return {
                    "project_id": pid,
                    "organisation_id": org_id,
                    "membership_id": mid,
                    "person_photo_url": kit_url,
                    "member_name": user_name,
                }

    return None


def generate_video(
    session: requests.Session,
    csrf: str,
    template_id: str,
    style_variant: str,
    person_photo_url: str,
    project_id: str,
    organisation_id: str,
    membership_id: str,
):
    """Call the generate endpoint for a video template."""
    payload = {
        "template_id": template_id,
        "params": {
            "kit_type": "home",
            "style_variant": style_variant,
        },
        "variant_count": 1,
        "input_images": {},
        "input_image_urls": {
            "person_photo": person_photo_url,
        },
        "organisation_id": organisation_id,
        "membership_id": membership_id,
    }

    print(f"\n{'='*70}")
    print(f"🎬 Generating: {template_id} / {style_variant}")
    print(f"   Person photo: {person_photo_url[:80]}...")
    print(f"   Endpoint: {API_BASE}/api/v1/generative/assets/generate/")
    print(f"{'='*70}")

    headers = {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf,
    }

    start = time.time()
    try:
        resp = session.post(
            f"{API_BASE}/api/v1/generative/assets/generate/",
            json=payload,
            headers=headers,
            timeout=600,  # 10 min max
        )
        elapsed = time.time() - start

        print(f"   Response: {resp.status_code} in {elapsed:.1f}s")

        if resp.status_code != 200:
            print(f"   ❌ Error: {resp.text[:500]}")
            return None

        data = resp.json()
        response_data = data.get("data") or data

        variants = response_data.get("variants") or []
        print(f"   Variants: {len(variants)}")

        for v in variants:
            video_url = v.get("video_url")
            storage_path = v.get("storage_path")
            file_asset_id = v.get("file_asset_id")
            filename = v.get("filename")
            print(f"   ✅ video_url: {video_url}")
            print(f"      storage_path: {storage_path}")
            print(f"      file_asset_id: {file_asset_id}")
            print(f"      filename: {filename}")

        return response_data

    except requests.Timeout:
        elapsed = time.time() - start
        print(f"   ❌ TIMEOUT after {elapsed:.0f}s")
        return None
    except Exception as e:
        elapsed = time.time() - start
        print(f"   ❌ ERROR after {elapsed:.0f}s: {e}")
        return None


# =============================================================================
# Video variants to generate
# =============================================================================

VIDEO_VARIANTS = [
    # Intro variants
    {"template_id": "member_intro", "style_variant": "arms_crossed", "label": "🙅 Armen over elkaar"},
    {"template_id": "member_intro", "style_variant": "hand_up", "label": "✋ Hand omhoog"},
    {"template_id": "member_intro", "style_variant": "thumbs_up", "label": "👍 Duim omhoog"},
    # Celebration variants
    {"template_id": "member_goal_celebration", "style_variant": "arms_wide", "label": "🙌 Armen wijd"},
    {"template_id": "member_goal_celebration", "style_variant": "fist_pump", "label": "✊ Vuist omhoog"},
    {"template_id": "member_goal_celebration", "style_variant": "point_to_sky", "label": "☝️ Wijs naar hemel"},
    {"template_id": "member_goal_celebration", "style_variant": "slide", "label": "🛝 Knieën slide"},
]


if __name__ == "__main__":
    print("🚀 Railway Video Generation Test")
    print(f"   API: {API_BASE}")

    # Parse args: specific variants or all
    if len(sys.argv) > 1:
        requested = sys.argv[1:]
        variants_to_gen = [
            v for v in VIDEO_VARIANTS
            if v["style_variant"] in requested or v["template_id"] in requested
        ]
        if not variants_to_gen:
            print(f"Unknown variant(s): {requested}")
            print(f"Available: {[v['style_variant'] for v in VIDEO_VARIANTS]}")
            sys.exit(1)
    else:
        variants_to_gen = VIDEO_VARIANTS

    print(f"   Variants to generate: {len(variants_to_gen)}")

    # Step 1: Get session
    print("\n🔌 Getting session...")
    session, csrf = get_csrf_and_session()
    print(f"   CSRF: {csrf[:20]}..." if csrf else "   No CSRF token (AllowAny endpoint)")

    # Step 2: Find a member with player-in-tenue
    print("\n🔍 Finding member with player-in-tenue image...")
    member_info = find_member_with_tenue(session)

    if not member_info:
        print("\n❌ No member found with player-in-tenue image.")
        print("   Please generate a fullbody_in_tenue first via the UI.")
        sys.exit(1)

    print(f"\n✅ Using member: {member_info['member_name']}")
    print(f"   Photo URL: {member_info['person_photo_url'][:80]}...")

    # Step 3: Generate videos
    results = {}
    for variant in variants_to_gen:
        result = generate_video(
            session=session,
            csrf=csrf,
            template_id=variant["template_id"],
            style_variant=variant["style_variant"],
            person_photo_url=member_info["person_photo_url"],
            project_id=member_info["project_id"],
            organisation_id=str(member_info["organisation_id"]),
            membership_id=str(member_info["membership_id"]),
        )
        results[f"{variant['template_id']}/{variant['style_variant']}"] = result

    # Summary
    print(f"\n{'='*70}")
    print("📊 RESULTS:")
    for key, result in results.items():
        if result and result.get("variants"):
            v = result["variants"][0]
            url = v.get("video_url", "no URL")
            print(f"   ✅ {key}: {url[:80]}...")
        else:
            print(f"   ❌ {key}: FAILED")
    print(f"{'='*70}")
