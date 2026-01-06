import urllib.request
import urllib.error
import json
import sys

FRONTEND_URL = "https://demo.teamreel.app"
BACKEND_URL = "https://api.teamreel.app"


def probe(url, method="GET", data=None):
    try:
        # Add timestamp to bust cache
        import time

        if "?" in url:
            url_with_ts = f"{url}&t={int(time.time())}"
        else:
            url_with_ts = f"{url}?t={int(time.time())}"

        req = urllib.request.Request(url_with_ts, method=method)
        if data:
            req.data = json.dumps(data).encode("utf-8")
            req.add_header("Content-Type", "application/json")

        # Add a User-Agent to avoid being blocked by some WAFs
        req.add_header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            return {
                "url": url,
                "status": response.status,
                "reason": response.reason,
                "redirected": response.geturl() != url,
            }
    except urllib.error.HTTPError as e:
        return {"url": url, "status": e.code, "reason": e.reason, "redirected": False}
    except urllib.error.URLError as e:
        return {"url": url, "status": "ERROR", "reason": str(e.reason), "redirected": False}
    except Exception as e:
        return {"url": url, "status": "EXCEPTION", "reason": str(e), "redirected": False}


print(f"Starting Verification for:\nFrontend: {FRONTEND_URL}\nBackend: {BACKEND_URL}\n")

# 1. Tasks Security Check
print("--- 1. Tasks Security Check ---")
res = probe(f"{BACKEND_URL}/api/v1/tasks/")
print(f"GET {BACKEND_URL}/api/v1/tasks/: {res['status']} {res['reason']}")
if res["status"] in [401, 403]:
    print("PASS: Endpoint is secured.")
elif res["status"] == 200:
    print("FAIL: Endpoint is still public!")
else:
    print(f"WARN: Unexpected status {res['status']}")

# 2. API Root Check
print("\n--- 2. API Root Check ---")
res = probe(f"{BACKEND_URL}/api/v1/")
print(f"GET {BACKEND_URL}/api/v1/: {res['status']} {res['reason']}")
if res["status"] == 200:
    print("PASS: API Root is healthy.")
elif res["status"] == 500:
    print("FAIL: API Root still returns 500.")
else:
    print(f"WARN: Unexpected status {res['status']}")

# 3. Files Page Wiring (Backend Route Check)
print("\n--- 3. Files Page Wiring (Backend Route Check) ---")
# We can't easily check the frontend network call without a browser,
# but we can verify the backend route exists and is protected (401) vs missing (404).
res = probe(f"{BACKEND_URL}/api/v1/files/")
print(f"GET {BACKEND_URL}/api/v1/files/: {res['status']} {res['reason']}")
if res["status"] == 401:
    print("PASS: V1 Files route exists and is protected.")
elif res["status"] == 404:
    print("FAIL: V1 Files route missing.")
else:
    print(f"WARN: Unexpected status {res['status']}")

# 4. Audit Page Wiring (Backend Route Check)
print("\n--- 4. Audit Page Wiring (Backend Route Check) ---")
res = probe(f"{BACKEND_URL}/api/v1/activity/")
print(f"GET {BACKEND_URL}/api/v1/activity/: {res['status']} {res['reason']}")
if res["status"] == 401:
    print("PASS: V1 Activity route exists and is protected.")
elif res["status"] == 404:
    print("FAIL: V1 Activity route missing.")
else:
    print(f"WARN: Unexpected status {res['status']}")

# 5. Legacy Audit Route Check (Should be gone)
print("\n--- 5. Legacy Audit Route Check ---")
res = probe(f"{BACKEND_URL}/api/audit/")
print(f"GET {BACKEND_URL}/api/audit/: {res['status']} {res['reason']}")
if res["status"] == 404:
    print("PASS: Legacy Audit route is gone (404).")
elif res["status"] in [200, 401, 403]:
    print("FAIL: Legacy Audit route still exists!")
else:
    print(f"WARN: Unexpected status {res['status']}")
