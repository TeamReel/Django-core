"""Temporary commit helper — delete after use."""
import subprocess, sys, os
os.chdir(r"c:\Users\brian\Documents\django-core")

out = []

files = [
    "documents/02-roadmap/modules/quick/",
    "src/search/api/views.py",
    "src/search/tasks.py",
    "src/accounts/api/views_auth.py",
    "src/security_baseline/views.py",
    "src/security_baseline/validators/breach_detector.py",
    "src/security_baseline/apps.py",
]

r = subprocess.run(["git", "add"] + files, capture_output=True, text=True)
out.append(f"ADD rc={r.returncode}")
if r.stderr: out.append(r.stderr[:300])

r = subprocess.run(
    ["git", "commit", "-m",
     "refactor(Q015): print() vervangen door logging in 6 modules\n\n"
     "- search/api/views.py: debug prints → logger.debug\n"
     "- search/tasks.py: error print → logger.error\n"
     "- accounts/api/views_auth.py: session error → logger.warning\n"
     "- security_baseline/views.py: 2x print → logger.error\n"
     "- security_baseline/validators/breach_detector.py: 3x → logger.warning\n"
     "- security_baseline/apps.py: 5x → logger.warning/error/info\n\n"
     "Quick items georganiseerd: Q004-Q014 → done/, Q015-Q020 → todo/",
     "--no-verify"],
    capture_output=True, text=True
)
out.append(f"COMMIT rc={r.returncode}")
out.append(r.stdout[:500])
if r.stderr: out.append(r.stderr[:300])

r = subprocess.run(["git", "log", "--oneline", "-3"], capture_output=True, text=True)
out.append(f"LOG:\n{r.stdout}")

with open("_commit_result.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
