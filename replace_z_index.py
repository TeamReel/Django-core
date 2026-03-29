import os
import re

all_css_files = []
for root, dirs, f in os.walk("demo/src"):
    for file in f:
        if file.endswith(".css"):
            all_css_files.append(os.path.join(root, file))

def replace_z(match):
    val = int(match.group(1))
    if val == 1: return "z-index: var(--z-base);"
    if val == 10: return "z-index: var(--z-dropdown);"
    if val == 80: return "z-index: var(--z-sticky);"
    if val == 90: return "z-index: var(--z-sticky);"
    if val == 100: return "z-index: var(--z-dropdown);"
    if val == 900: return "z-index: var(--z-modal);"
    if val == 1000: return "z-index: var(--z-modal);"
    if val == 1001: return "z-index: var(--z-toast);"
    if val == 1100: return "z-index: var(--z-toast);"
    if val == 1150: return "z-index: var(--z-sheet);"
    if val == 1200: return "z-index: var(--z-tooltip);"
    if val == 10000: return "z-index: var(--z-toast);"
    if val == 10001: return "z-index: var(--z-max);"
    if val == 9999: return "z-index: var(--z-max);"
    if val == -1: return "z-index: -1;"
    return f"z-index: {val};"

import sys
for file in all_css_files:
    if "tokens.css" in file: continue
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = re.sub(r'z-index:\s*(-?\d+);', replace_z, content)
    
    if new_content != content:
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {file}")

print("Done")