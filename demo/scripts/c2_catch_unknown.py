"""
C2 — Replace catch(err: any) with catch(err: unknown).

TypeScript best practice: catch parameters should be `unknown`, not `any`.
This forces proper type narrowing before using the error.

Also replaces:
  catch (e: any) → catch (e: unknown)
  catch (error: any) → catch (error: unknown)
"""

import re
from pathlib import Path

DEMO_SRC = Path(__file__).resolve().parent.parent / "src"
SKIP_DIRS = {"_archive", "node_modules"}

changes_log = []


def should_skip(path: Path) -> bool:
    return any(d in path.parts for d in SKIP_DIRS)


def process_file(path: Path) -> int:
    if should_skip(path):
        return 0
    text = path.read_text(encoding="utf-8")
    if ": any" not in text:
        return 0

    original = text
    count = 0

    # Replace catch parameter any → unknown
    def replace_catch(m):
        nonlocal count
        count += 1
        return m.group(0).replace(": any", ": unknown")

    text = re.sub(r"catch\s*\(\s*\w+\s*:\s*any\s*\)", replace_catch, text)

    # Also replace: any[] → unknown[] for common patterns
    # BUT only for clearly safe patterns like function params that are arrays
    # Skip this - too risky without context

    if text != original:
        path.write_text(text, encoding="utf-8")
        rel = path.relative_to(DEMO_SRC)
        changes_log.append(f"  {rel}: {count} catch params")

    return count


def main():
    files = sorted(f for f in DEMO_SRC.rglob("*.ts*") if f.suffix in (".ts", ".tsx"))
    total = 0
    file_count = 0
    for f in files:
        n = process_file(f)
        if n > 0:
            total += n
            file_count += 1

    print(f"\n✅ C2a Complete: {total} catch(: any) → catch(: unknown) in {file_count} files\n")
    if changes_log:
        print("Changes:")
        for c in changes_log:
            print(c)


if __name__ == "__main__":
    main()
