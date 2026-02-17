import json
import subprocess
import os

def analyze_webm(filepath):
    """
    Since we don't have ffprobe, we'll parse FFmpeg's output
    to detect 'yuva420p' or 'vp9' etc.
    """
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    print(f"Analyzing {filepath}...")
    try:
        # ffmpeg -i file.webm usually prints info to stderr
        result = subprocess.run(
            ["ffmpeg", "-i", filepath],
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True
        )
        # It exits with 1 usually because no output specified, but stderr is what we want
        output = result.stderr

        # Check for transparency indicators
        is_vp9 = "vp9" in output
        is_alpha = "yuva420p" in output or "alpha" in output

        print("--- FFmpeg Output Snippet ---")
        for line in output.splitlines():
            if "Stream #0" in line:
                print(line)
        print("-----------------------------")

        if is_vp9 and is_alpha:
            print("VERDICT: Looks like a transparent WebM (VP9 + Alpha).")
        elif is_vp9:
            print("VERDICT: Valid VP9 WebM, but alpha channel (yuva420p) not explicitly detected in grep.")
        else:
            print("VERDICT: Format might be different.")

    except FileNotFoundError:
        print("Cannot run ffmpeg to analyze. Ensure ffmpeg is in PATH or download manually.")

if __name__ == "__main__":
    analyze_webm("repro_lineup/julius_processed.webm")
