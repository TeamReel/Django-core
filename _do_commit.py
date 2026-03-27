import subprocess, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

subprocess.run(['git', 'add', '-A'], check=True)

msg = """docs(roadmap): add F30 phases H6-H9 — CSS tokens, type consolidation, API typing, a11y

Based on comprehensive frontend audit:
- H6: CSS Design Token Migration (~10h) — 329+ hardcoded values
- H7: Type Consolidation (~5h) — unify User + Project types
- H8: API Response Typing (~4h) — eliminate any from API calls
- H9: A11y & Conventions (~3h) — emoji, aria-labels, eslint-disable

Updated F30 index.md with new phases and acceptance criteria."""

r = subprocess.run(['git', 'commit', '-m', msg], capture_output=True, text=True, encoding='utf-8')
with open('_commit_result.txt', 'w', encoding='utf-8') as f:
    f.write(f"EXIT: {r.returncode}\nSTDOUT:\n{r.stdout}\nSTDERR:\n{r.stderr}\n")
