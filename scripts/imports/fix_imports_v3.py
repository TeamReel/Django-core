import os
import re

root_dir = "packages/design-system/src"
print(f"Scanning {os.path.abspath(root_dir)}")

count = 0
for subdir, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            filepath = os.path.join(subdir, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Replace .css.js with .css
            # We look for .css.js inside quotes
            new_content = re.sub(r"([\'\"])(.+?)\.css\.js\1", r"\1\2.css\1", content)

            if content != new_content:
                print(f"Updating {filepath}")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                count += 1

print(f"Updated {count} files.")
