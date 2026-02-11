"""Test MiniMax/Hailuo video generation with full-body player photos.

Generates 4 different video styles from the same player photos:
1. Lineup pose (arms at sides, confident stance)
2. Thumbs up
3. Hands up / celebration
4. Goal celebration (fist pump)
"""

import os
import sys
import time

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------
API_KEY = os.environ.get("MINIMAX_API_KEY")
GROUP_ID = os.environ.get("MINIMAX_GROUP_ID")

if not API_KEY:
    print("ERROR: Set MINIMAX_API_KEY environment variable")
    sys.exit(1)

# Player photos (green screen full body shots)
PHOTO_ASC = r"C:\Users\brian\Documents\django-core\asc\output_v9\ajax\fullbody\fullbody_in_tenue_1_sleeves-long_pose-standing_arms_crossed_role-goalkeeper.png"
PHOTO_AJAX = r"C:\Users\brian\Documents\django-core\asc\output_v9\asc\fullbody\fullbody_in_tenue_1_sleeves-long_pose-standing_arms_crossed_role-goalkeeper.png"

# If those don't exist, check common locations
for p in [PHOTO_ASC, PHOTO_AJAX]:
    if not os.path.exists(p):
        print(f"WARNING: Photo not found: {p}")

OUTPUT_DIR = r"C:\Users\brian\Documents\django-core\asc\output_minimax"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --------------------------------------------------------------------------
# Video generation prompts for each style
# --------------------------------------------------------------------------
VIDEO_STYLES = {
    "lineup": {
        "prompt": (
            "Create a 5-second PLAYER INTRO VIDEO. Living portrait style. "
            "The football player stands confidently at the camera, arms relaxed at sides. "
            "Subtle breathing and weight shift movement. The player looks directly at camera "
            "with a calm, confident expression. Professional broadcast-quality. "
            "Solid green background. Full body shot, do not crop head or feet. "
            "Cinematic lighting. 720p vertical video."
        ),
        "photo": PHOTO_ASC,
    },
    "thumbs_up": {
        "prompt": (
            "Create a 5-second PLAYER VIDEO. The football player stands facing the camera, "
            "then slowly raises one hand to give a confident THUMBS UP to the camera. "
            "Natural, realistic movement. Friendly smile. The player is in full football kit. "
            "Solid green background. Full body visible at all times. "
            "Professional sports broadcast quality. 720p."
        ),
        "photo": PHOTO_AJAX,
    },
    "hands_up": {
        "prompt": (
            "Create a 5-second PLAYER CELEBRATION VIDEO. The football player raises BOTH ARMS "
            "above their head in a triumphant victory pose. Big smile, pure joy expression. "
            "The player pumps their fists in the air. Full football kit visible. "
            "Solid green background. Full body shot, head to toe. "
            "High-energy but controlled movement. Broadcast quality. 720p."
        ),
        "photo": PHOTO_ASC,
    },
    "celebration": {
        "prompt": (
            "Create a 5-second GOAL CELEBRATION VIDEO. The football player does a powerful "
            "FIST PUMP celebration, pulling their arm down with intensity. Pure adrenaline joy. "
            "The player might do a small jump or knee slide. Dramatic, emotional moment. "
            "Full football kit visible. Solid green background or blurry stadium bokeh. "
            "Full body always visible. Sports broadcast quality. 720p."
        ),
        "photo": PHOTO_AJAX,
    },
}


def generate_one(style_name: str, style_config: dict) -> str | None:
    """Generate a single video and return the output path."""
    # Use our own robust client instead of the buggy minimax-python SDK
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
    from generative.services.minimax_client import MiniMaxClient

    prompt = style_config["prompt"]
    photo_path = style_config["photo"]
    use_image = os.path.exists(photo_path)

    output_path = os.path.join(OUTPUT_DIR, f"{style_name}_{int(time.time())}.mp4")

    print(f"\n{'='*60}")
    print(f"🎬 Generating: {style_name}")
    print(f"   Image-to-Video: {use_image}")
    if use_image:
        print(f"   Photo: {os.path.basename(photo_path)}")
    print(f"   Prompt: {prompt[:80]}...")
    print(f"   Output: {output_path}")
    print(f"{'='*60}")

    client = MiniMaxClient(
        api_key=API_KEY,
        group_id=GROUP_ID,
        timeout=120.0,
        poll_interval=5.0,
        max_wait=600.0,
    )

    start = time.time()

    try:
        image_input = photo_path if use_image else None

        result = client.generate_video(
            prompt=prompt,
            image=image_input,
            output_path=output_path,
            model="video-01",
        )

        elapsed = time.time() - start
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"   ✅ Done in {elapsed:.0f}s — {size_mb:.1f} MB")
        print(f"   task_id={result['task_id']}, file_id={result['file_id']}")
        print(f"   Resolution: {result.get('video_width', '?')}x{result.get('video_height', '?')}")

        client.close()
        return output_path

    except Exception as e:
        elapsed = time.time() - start
        print(f"   ❌ FAILED after {elapsed:.0f}s: {e}")
        client.close()
        return None


# --------------------------------------------------------------------------
# Main: Generate first one as quick test, then the rest
# --------------------------------------------------------------------------
if __name__ == "__main__":
    # Configure logging so our client messages show up
    import logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    print("🚀 MiniMax/Hailuo Video Generation Test")
    print(f"   API Key: {API_KEY[:20]}...{API_KEY[-8:]}")
    print(f"   Group ID: {GROUP_ID}")
    print(f"   Output dir: {OUTPUT_DIR}")

    # Quick connectivity test first
    print("\n🔌 Testing API connectivity...")
    import sys as _sys
    _sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
    from generative.services.minimax_client import MiniMaxClient
    try:
        test_client = MiniMaxClient(api_key=API_KEY, group_id=GROUP_ID, timeout=30.0)
        print("   ✅ Client initialized OK")
        test_client.close()
    except Exception as e:
        print(f"   ❌ Client init failed: {e}")
        sys.exit(1)

    # Generate one style at a time (MiniMax is async but we wait for each)
    if len(sys.argv) > 1:
        # Generate specific style(s)
        styles_to_gen = sys.argv[1:]
    else:
        # Generate all
        styles_to_gen = list(VIDEO_STYLES.keys())

    results = {}
    for style in styles_to_gen:
        if style not in VIDEO_STYLES:
            print(f"Unknown style: {style}. Options: {list(VIDEO_STYLES.keys())}")
            continue
        path = generate_one(style, VIDEO_STYLES[style])
        results[style] = path

    print(f"\n{'='*60}")
    print("📊 RESULTS:")
    for style, path in results.items():
        status = "✅" if path else "❌"
        print(f"   {status} {style}: {path or 'FAILED'}")
    print(f"{'='*60}")
