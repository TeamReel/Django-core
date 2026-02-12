"""Quick inline MiniMax test with full logging."""
import logging
import sys
import os
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from generative.services.minimax_client import MiniMaxClient

API_KEY = os.environ.get("MINIMAX_API_KEY")
GROUP_ID = os.environ.get("MINIMAX_GROUP_ID")

photo = r"C:\Users\brian\Documents\django-core\asc\output_v9\ajax\fullbody\fullbody_in_tenue_1_sleeves-long_pose-standing_arms_crossed_role-goalkeeper.png"

if not os.path.exists(photo):
    print(f"Photo not found: {photo}")
    sys.exit(1)

print(f"Photo size: {os.path.getsize(photo)} bytes")

client = MiniMaxClient(
    api_key=API_KEY,
    group_id=GROUP_ID,
    timeout=180.0,
    poll_interval=5.0,
    max_wait=600.0,
)

prompt = "A football player stands confidently, subtle breathing movement. Green background. Full body shot. 5 seconds."

print("Creating task...")
t0 = time.time()
task_id = client.create_video(prompt=prompt, image=photo)
print(f"Task created in {time.time()-t0:.1f}s: {task_id}")

print("Polling for completion...")
result = client.wait_for_video(task_id)
print(f"Done in {time.time()-t0:.1f}s! file_id={result.get('file_id')}")

out = r"C:\Users\brian\Documents\django-core\asc\output_minimax\test_lineup.mp4"
os.makedirs(os.path.dirname(out), exist_ok=True)

print("Downloading...")
v_bytes = client.download_video(result["file_id"], out)
print(f"Saved {len(v_bytes)} bytes ({len(v_bytes)/1024/1024:.1f} MB) to {out}")
print(f"Total time: {time.time()-t0:.1f}s")
client.close()
