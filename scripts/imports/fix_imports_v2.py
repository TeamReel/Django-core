import os
import re

root_dir = "packages/design-system/src"
for subdir, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            filepath = os.path.join(subdir, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Replace .css.ts with .css.js in imports
            # Handle both single and double quotes
            new_content = re.sub(r"from ([\'\"])(.+?)\.css\.ts\1", r"from \1\2.css.js\1", content)

            if content != new_content:
                print(f"Updating {filepath}")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
