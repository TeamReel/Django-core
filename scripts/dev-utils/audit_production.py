import urllib.request
import urllib.error
import json
import sys

FRONTEND_URL = "https://demo.teamreel.app"
BACKEND_URL = "https://api.teamreel.app"


def probe(url, method="GET", data=None):
    try:
        req = urllib.request.Request(url, method=method)
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


print(f"Starting Audit for:\nFrontend: {FRONTEND_URL}\nBackend: {BACKEND_URL}\n")

# 1. Frontend Probes
print("--- Frontend Probes ---")
frontend_routes = ["/", "/dashboard", "/integration-status", "/health"]
for route in frontend_routes:
    res = probe(f"{FRONTEND_URL}{route}")
    print(f"{route}: {res['status']} {res['reason']}")

# 2. Backend API Surface
print("\n--- Backend API Surface ---")
api_endpoints = [
    "/health/live",
    "/api/schema/",
    "/api/docs/",
    "/api/v1/",
    "/api/",
]
for endpoint in api_endpoints:
    res = probe(f"{BACKEND_URL}{endpoint}")
    print(f"{endpoint}: {res['status']} {res['reason']}")

# 3. Module Verification
print("\n--- Module Verification ---")
modules = [
    ("B05 Auth", "/api/v1/auth/token/", "POST", {"username": "test", "password": "test"}),
    ("B06 Orgs", "/api/v1/organisations/", "GET", None),
    ("B07 Projects", "/api/v1/projects/", "GET", None),
    ("B09 Audit (Legacy)", "/api/audit/", "GET", None),
    ("B09 Audit (V1)", "/api/v1/activity/", "GET", None),
    ("B10 Settings", "/api/v1/settings/", "GET", None),
    ("B15 Tasks", "/api/v1/tasks/", "GET", None),
    ("B16 Notifications", "/api/v1/notifications/", "GET", None),
    ("B22 Files (V1)", "/api/v1/files/", "GET", None),
    ("B22 Files (Legacy)", "/api/files/", "GET", None),
    ("B24 Search", "/api/v1/search/", "GET", None),
    ("B25 Cache", "/api/v1/system/cache/metrics/", "GET", None),
]

for name, endpoint, method, data in modules:
    res = probe(f"{BACKEND_URL}{endpoint}", method=method, data=data)
    print(f"{name}: {res['status']} {res['reason']}")
