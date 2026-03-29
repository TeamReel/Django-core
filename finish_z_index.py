import re, glob
for file in glob.glob('demo/src/**/*.css', recursive=True):
    if 'tokens.css' in file: continue
    with open(file, 'r', encoding='utf-8') as f: content = f.read()

    original = content
    # Replacements:
    # 200 -> var(--z-sticky)
    content = re.sub(r'z-index:\s*200;', r'z-index: var(--z-sticky);', content)
    # 9000, 9998, 2000 -> var(--z-max)
    content = re.sub(r'z-index:\s*(?:9000|9998|2000);', r'z-index: var(--z-max);', content)
    # 998, 999 -> var(--z-modal)
    content = re.sub(r'z-index:\s*(?:998|999);', r'z-index: var(--z-modal);', content)
    # 50, 60 -> var(--z-dropdown)
    content = re.sub(r'z-index:\s*(?:50|60);', r'z-index: var(--z-dropdown);', content)
    # 1199 -> var(--z-tooltip)
    content = re.sub(r'z-index:\s*1199;', r'z-index: var(--z-tooltip);', content)
    # 2, 3, 4, 5, 20, 25 -> var(--z-base)
    content = re.sub(r'z-index:\s*(?:2|3|4|5|20|25);', r'z-index: var(--z-base);', content)

    if original != content:
        with open(file, 'w', encoding='utf-8') as f: f.write(content)
        print("Updated:", file)
