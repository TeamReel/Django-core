#!/usr/bin/env python3
"""Fix relative api imports to use @/api alias."""
import re
from pathlib import Path

demo_src = Path('demo/src')
count = 0

# Pattern matches: from '../../api' or from "../api" or from '../../../api'
pattern = re.compile(r"from ['\"](\.\./)+api['\"]")

# Debug: Print a specific file
debug_file = Path('demo/src/pages/identity/OrganisationCreatePage.tsx')
if debug_file.exists():
    content = debug_file.read_text(encoding='utf-8')
    print(f"Debug file exists, checking pattern...")
    if pattern.search(content):
        print("Pattern found!")
    else:
        print("Pattern NOT found")
        # Let's see the imports
        for line in content.split('\n')[:20]:
            if 'import' in line:
                print(line)

for ext in ['*.tsx', '*.ts']:
    for f in demo_src.rglob(ext):
        if f.suffix == '.ts' and str(f).endswith('.d.ts'):
            continue
        try:
            content = f.read_text(encoding='utf-8')
            if pattern.search(content):
                new_content = pattern.sub("from '@/api'", content)
                f.write_text(new_content, encoding='utf-8')
                count += 1
                print(f.relative_to('demo/src'))
        except Exception as e:
            print(f"Error processing {f}: {e}")

print(f'\nTotal: {count} files updated')
