import os
import re


def fix_imports(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".ts") or filename.endswith(".tsx"):
                filepath = os.path.join(dirpath, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                def replace_import(match):
                    full_match = match.group(0)
                    import_path = match.group(1)
                    quote = match.group(2)

                    if import_path.endswith(".css"):
                        # Check if .css.ts exists
                        # Resolve path relative to current file
                        rel_dir = os.path.dirname(filepath)
                        target_path = os.path.join(rel_dir, import_path + ".ts")

                        if os.path.exists(target_path):
                            print(f"Fixing import in {filepath}: {import_path} -> {import_path}.ts")
                            return (
                                f"from '{import_path}.ts{quote}"
                                if "'" in full_match
                                else f'from "{import_path}.ts{quote}'
                            )

                        # Also check for import ... from ...
                        # The regex below captures "from 'path'"

                    return full_match

                # Regex for: from 'path.css' or from "path.css"
                # We want to capture the path and the closing quote
                # Pattern: from\s+['"]([^'"]+\.css)(['"])

                new_content = re.sub(
                    r"from\s+(['\"])([^'\"]+\.css)(['\"])",
                    lambda m: (
                        f"from {m.group(1)}{m.group(2)}.ts{m.group(3)}"
                        if os.path.exists(
                            os.path.join(os.path.dirname(filepath), m.group(2) + ".ts")
                        )
                        else m.group(0)
                    ),
                    content,
                )

                # Also handle: import 'path.css' (side effect import) - usually real CSS, but check anyway
                # But vanilla extract files are usually imported with named exports.

                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)


fix_imports("packages/design-system")
