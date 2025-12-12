#!/usr/bin/env python3
"""Quick diagnostic tool to check Activity Log format in work packages."""

import re
import sys
from pathlib import Path

# Add parent directory to path for imports
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from task_helpers import activity_entries, split_frontmatter


def check_activity_log(wp_path: Path) -> None:
    """Check if a work package has correctly formatted activity log entries."""
    content = wp_path.read_text(encoding="utf-8")
    frontmatter, body, _ = split_frontmatter(content)

    # Check if ## Activity Log section exists
    if "## Activity Log" not in body:
        print(f"❌ {wp_path.name}: Missing '## Activity Log' section")
        return

    # Parse entries using validator's regex
    entries = activity_entries(body)

    if not entries:
        print(f"❌ {wp_path.name}: Activity Log section exists but no entries parsed")
        print("   Check format: - TIMESTAMP – AGENT – shell_pid=PID – lane=LANE – Note")

        # Show what's in the Activity Log section
        log_section = re.search(r"## Activity Log.*?(?=\n## |\Z)", body, flags=re.DOTALL)
        if log_section:
            lines = log_section.group(0).split("\n")[1:6]  # First 5 lines after header
            print("   Found in Activity Log section:")
            for line in lines:
                if line.strip():
                    print(f"     {line[:80]}")
        return

    # Check for YAML-formatted entries in frontmatter
    yaml_history = False
    if "history:" in frontmatter or "- date:" in frontmatter:
        yaml_history = True
        print(f"⚠️  {wp_path.name}: YAML history found in frontmatter (not parsed by validator)")

    # Determine current lane from path
    if wp_path.parent.name in ["planned", "doing", "for_review", "done"]:
        current_lane = wp_path.parent.name
    else:
        current_lane = None

    # Extract lanes from entries
    lanes = {e["lane"] for e in entries}
    latest_lane = entries[-1]["lane"] if entries else None

    print(f"✅ {wp_path.name}: Found {len(entries)} entries")
    print(f"   Lanes logged: {', '.join(sorted(lanes))}")
    print(f"   Latest entry: lane={latest_lane}")

    # Validate for current lane
    if current_lane:
        if current_lane not in lanes:
            print(f"   ❌ PROBLEM: Missing entry for current lane={current_lane}")
        if current_lane == "done" and latest_lane != "done":
            print(f"   ❌ PROBLEM: Work package in done/ but latest entry is lane={latest_lane}")

    if yaml_history:
        print(f"   ⚠️  Consider removing YAML history from frontmatter (validator ignores it)")


def main():
    """Check activity logs for a feature or specific work package."""
    if len(sys.argv) < 2:
        print("Usage: python check_activity_logs.py <feature-slug>")
        print("       python check_activity_logs.py <path-to-work-package.md>")
        sys.exit(1)

    arg = sys.argv[1]

    # Check if it's a file path
    if Path(arg).exists() and Path(arg).is_file():
        check_activity_log(Path(arg))
        return

    # Otherwise treat as feature slug
    feature = arg
    repo_root = Path.cwd()

    # Try common locations
    possible_roots = [
        repo_root,
        repo_root.parent,
        repo_root.parent.parent,
    ]

    feature_dir = None
    for root in possible_roots:
        candidate = root / "kitty-specs" / feature / "tasks"
        if candidate.exists():
            feature_dir = candidate
            break

    if not feature_dir:
        print(f"❌ Could not find feature directory for: {feature}")
        print(
            f"   Searched in: {', '.join(str(r / 'kitty-specs' / feature) for r in possible_roots)}"
        )
        sys.exit(1)

    print(f"Checking feature: {feature}")
    print(f"Location: {feature_dir}\n")

    # Check all work packages
    problems_found = False
    for lane in ["planned", "doing", "for_review", "done"]:
        lane_dir = feature_dir / lane
        if not lane_dir.exists():
            continue

        for wp_file in sorted(lane_dir.glob("*.md")):
            check_activity_log(wp_file)
            print()

    print("\n" + "=" * 80)
    print("💡 TIP: See .kittify/scripts/tasks/ACTIVITY_LOG_FORMAT.md for format guide")


if __name__ == "__main__":
    main()
