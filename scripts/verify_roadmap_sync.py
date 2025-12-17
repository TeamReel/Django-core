"""
Verify that PROJECT_ROADMAP.md is in sync with fase documents.

This script:
1. Parses all fase-*.md files in docs/project/phases/
2. Extracts module numbers and titles
3. Compares with PROJECT_ROADMAP.md
4. Reports any mismatches

Usage:
    python scripts/verify_roadmap_sync.py
"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

# Project root
ROOT = Path(__file__).parent.parent


def parse_fase_doc(fase_path: Path) -> Dict[int, str]:
    """Parse a fase document and extract module numbers + titles."""
    content = fase_path.read_text(encoding="utf-8")
    modules = {}

    # Match: ## 31. F10 – Demo Shell (Basic)
    pattern = r"^##\s+(\d+)\.\s+([A-Z0-9]+-?\w*)\s+[–—]\s+(.+?)(?:\s+✅|\s+🚧|\s*$)"

    for match in re.finditer(pattern, content, re.MULTILINE):
        module_num = int(match.group(1))
        module_code = match.group(2)
        module_title = match.group(3).strip()
        modules[module_num] = f"{module_code} — {module_title}"

    return modules


def parse_roadmap() -> Dict[int, str]:
    """Parse PROJECT_ROADMAP.md and extract module listings."""
    roadmap_path = ROOT / "docs" / "project" / "PROJECT_ROADMAP.md"
    content = roadmap_path.read_text(encoding="utf-8")
    modules = {}

    # Match: - **B01** — Core Project Skeleton
    pattern = r"^\s*-\s+\*\*([A-Z0-9]+-?\w*)\*\*\s+[–—]\s+(.+?)(?:\s+✅|\s+🚧|\s*$)"

    module_counters = {"B": 0, "F": 0, "P": 0, "D": 0, "I": 0, "O": 0}

    for match in re.finditer(pattern, content, re.MULTILINE):
        module_code = match.group(1)
        module_title = match.group(2).strip()

        # Extract prefix (B, F, P, D, I, O)
        prefix = module_code[0]
        if prefix in module_counters:
            module_counters[prefix] += 1

        # Determine module number based on ranges
        if prefix == "B":
            if int(module_code[1:]) <= 21:
                module_num = int(module_code[1:])
            else:
                module_num = int(module_code[1:]) + 13  # B22-B28 -> 034-043
        elif prefix == "F":
            if module_code.startswith("F10b"):
                if "Database" in module_title:
                    module_num = 32
                elif "Pages" in module_title:
                    module_num = 33
                else:
                    continue
            else:
                module_num = int(module_code[1:]) + 21  # F01-F15 -> 022-036+
        elif prefix == "P":
            module_num = int(module_code[1:]) + 63  # P01-P05 -> 064-068
        elif prefix == "D":
            module_num = int(module_code[1:]) + 47  # D01-D16 -> 048-063
        elif prefix == "I":
            module_num = int(module_code[1:]) + 68  # I01-I02 -> 069-070
        elif prefix == "O":
            module_num = 71  # O01 -> 071
        else:
            continue

        modules[module_num] = f"{module_code} — {module_title}"

    return modules


def main():
    print("🔍 Verifying roadmap sync with fase documents...\n")

    # Parse all fase docs
    fase_modules = {}
    fase_dir = ROOT / "docs" / "project" / "phases"

    for fase_path in sorted(fase_dir.rglob("fase-*.md")):
        fase_name = fase_path.stem
        modules = parse_fase_doc(fase_path)
        if modules:
            print(f"✅ {fase_name}: {len(modules)} modules")
            fase_modules.update(modules)

    print(f"\n📊 Total modules in fase docs: {len(fase_modules)}")

    # Parse roadmap
    roadmap_modules = parse_roadmap()
    print(f"📊 Total modules in roadmap: {len(roadmap_modules)}\n")

    # Compare
    mismatches = []

    for module_num in sorted(set(fase_modules.keys()) | set(roadmap_modules.keys())):
        fase_title = fase_modules.get(module_num)
        roadmap_title = roadmap_modules.get(module_num)

        if fase_title != roadmap_title:
            mismatches.append((module_num, fase_title, roadmap_title))

    if mismatches:
        print("❌ MISMATCHES FOUND:\n")
        for module_num, fase_title, roadmap_title in mismatches:
            print(f"Module {module_num:03d}:")
            print(f"  Fase:    {fase_title or '(missing)'}")
            print(f"  Roadmap: {roadmap_title or '(missing)'}")
            print()
        return 1
    else:
        print("✅ All modules match! Roadmap is in sync with fase documents.")
        return 0


if __name__ == "__main__":
    exit(main())
