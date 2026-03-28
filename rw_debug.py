import subprocess, json

RAILWAY = r"C:\Users\brian\AppData\Roaming\npm\railway.cmd"
CWD = r"c:\Users\brian\Documents\django-core"
OUT = CWD + "/rw_debug.txt"

buf = []

def run(args, label):
    try:
        r = subprocess.run([RAILWAY] + args, capture_output=True, text=True, timeout=30, cwd=CWD)
        buf.append(f"=== {label} ===")
        buf.append(f"EXIT: {r.returncode}")
        if r.stdout.strip():
            buf.append(r.stdout.strip())
        if r.stderr.strip():
            buf.append("STDERR: " + r.stderr.strip())
        buf.append("")
    except Exception as e:
        buf.append(f"=== {label} === ERROR: {e}\n")

run(["link", "--help"], "railway link --help")
run(["whoami"], "railway whoami")
run(["status"], "railway status")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(buf))
