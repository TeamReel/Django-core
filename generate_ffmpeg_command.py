import os
from pathlib import Path

# Mock constants/inputs
WIDTH = 1080  # vertical_1080p
HEIGHT = 1920
FPS = 30
TARGET_H_PCT = 0.22

# Players data (mocked positions)
PLAYERS = [
    # Test with the provided "processed" WebM (transparent input)
    {"name": "Julius (WebM)", "file": "repro_lineup/julius_processed.webm", "x_pct": 50, "y_pct": 50},
    # Input 2: The MP4 file (generated/ruwe as user calls it, possibly black BG input)
    {"name": "Julius (MP4)", "file": "repro_lineup/julius_generated_s3.mp4", "x_pct": 20, "y_pct": 50},
]

BACKGROUND = "repro_lineup/background.png"  # Placeholder
OUTPUT = "repro_lineup/output.mp4"

def generate_command():
    inputs = []
    # 0: Background (Loop)
    # We don't have a background file, let's just use color source for testing command generation
    # effectively: -f lavfi -i color=c=green:s=1080x1920
    # But to match script structure, let's pretend file 0 is bg
    inputs.extend(["-f", "lavfi", "-i", f"color=c=green:s={WIDTH}x{HEIGHT}:d=5"])

    # Players inputs
    player_inputs = []
    base_idx = 1 # 0 is BG

    for i, p in enumerate(PLAYERS):
        path = p["file"]
        # In real script, we check extension. Here we assume mp4 video
        is_video = True

        inputs.extend(["-i", path])

        player_inputs.append({
            "idx": base_idx + i,
            "x_pct": p["x_pct"],
            "y_pct": p["y_pct"],
            "is_video": is_video
        })

    # Filter Complex Construction
    fc = []

    # Scale background (mocked as input 0)
    fc.append(f"[0:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT},setsar=1[bg]")
    last = "bg"

    target_h = int(HEIGHT * TARGET_H_PCT)
    W = WIDTH
    H = HEIGHT
    w = "w"
    h = "h"

    for p in player_inputs:
        pid = p["idx"]
        # THE FIX: Apply colorkey and scaley
        # format=rgba,colorkey=0x000000:0.1:0.1,scale=-1:{target_h}
        fc.append(f"[{pid}:v]format=rgba,colorkey=0x000000:0.1:0.1,scale=-1:{target_h}[p{pid}_s]")

        # Position
        x_expr = f"(W*{p['x_pct']}/100-w/2)"
        y_expr = f"(H*0.15+(H*0.85)*{p['y_pct']}/100-h)"

        # THE FIX: shortest=0:eof_action=repeat
        fc.append(f"[{last}][p{pid}_s]overlay=x={x_expr}:y={y_expr}:shortest=0:eof_action=repeat[ov{pid}]")
        last = f"ov{pid}"

    fc.append(f"[{last}]fps={FPS},format=yuv420p[out]")

    cmd = (
        ["ffmpeg", "-y"] +
        inputs +
        [
            "-filter_complex", ";".join(fc),
            "-map", "[out]",
            "-t", "5",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-an",
            OUTPUT
        ]
    )

    print("Generated FFmpeg Command:")
    print(" ".join(cmd))

    # Create a bat file for user to run easily if they have ffmpeg
    with open("repro_lineup/run_ffmpeg.bat", "w") as f:
        f.write(" ".join(cmd))

if __name__ == "__main__":
    generate_command()
