import os
import sys
from pathlib import Path
import json

# Setup path
src_dir = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(src_dir))

# Mock get_best_url from asset_processing_specs to isolate dependencies
# But better to import if possible. Let's try importing.
# We need django setup for apps.get_model calls if they happen, but
# asset_processing_specs seems independent of models.

try:
    from video.services.asset_processing_specs import get_best_url
    from video.services.lineup_builder import _find_best_intro_url, _INTRO_STYLE_PRIORITY
except ImportError as e:
    print(f"Import failed: {e}")
    sys.exit(1)

# Julius's metadata for INTRO
# Based on earlier dump
julius_intro_variants = {
    "home_hand_up": {
        "raw": "members/a64e0cde-4cb5-400d-9677-eef2d7d26511/a64e0cde-4cb5-400d-9677-eef2d7d26511_b6c5fc1e.mp4",
        "specs": {
            "fps": 15,
            "codec": "vp9",
            "width": 1080,
            "format": "webm",
            "height": 1920,
            "duration": 5.734,
            "bg_removed": True,
            "total_frames": 86
        },
        "processed": "members/a64e0cde-4cb5-400d-9677-eef2d7d26511/processed/intro/home_hand_up_ad9d8950.webm",
        "processed_at": "2026-02-13T21:38:54.547258+00:00",
        "processing_state": "processed"
    }
}

def test_selection():
    print("Testing selection logic...")
    print(f"Variants keys: {list(julius_intro_variants.keys())}")

    # Test 1: kit_type = 'home'
    print("\n--- Test 1: kit_type='home' ---")
    url = _find_best_intro_url(julius_intro_variants, "home", get_best_url)
    print(f"Result URL: {url}")

    if "processed" in str(url):
        print("SUCCESS: Selected processed URL")
    else:
        print("FAILURE: Did not select processed URL")

    # Test 2: kit_type = 'away' (fallback to home)
    print("\n--- Test 2: kit_type='away' ---")
    url = _find_best_intro_url(julius_intro_variants, "away", get_best_url)
    print(f"Result URL: {url}")

    if "processed" in str(url):
        print("SUCCESS: Selected processed URL via fallback")
    else:
        print("FAILURE: Did not select processed URL via fallback")

    # Test 3: Debugging find_with_prefix logic manually if needed
    print("\n--- Debugging _INTRO_STYLE_PRIORITY ---")
    print(f"Priority: {_INTRO_STYLE_PRIORITY}")

if __name__ == "__main__":
    try:
        test_selection()
    except Exception as e:
        import traceback
        traceback.print_exc()
