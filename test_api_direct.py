import requests
import json

# Test the API directly
url = "https://api.teamreel.app/api/v1/admin/users/?limit=50&offset=0&project_id=7&is_active=true"

print(f"Testing: {url}\n")

# Note: This will fail without authentication cookies
# But we can see the structure
response = requests.get(url)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"\nResponse structure:")
    print(f"  Keys: {list(data.keys())}")

    results = data.get("data", {}).get("results", data.get("results", []))
    count = data.get("data", {}).get("count", data.get("count", 0))

    print(f"  Count: {count}")
    print(f"  Results: {len(results)} users")

    if results:
        print(f"\nFirst user:")
        print(f"  Email: {results[0].get('email')}")
        print(f"  Role: {results[0].get('role')}")
        print(f"  Projects: {len(results[0].get('projects', []))}")
elif response.status_code == 401:
    print("Need authentication - this is expected")
else:
    print(f"Error: {response.text[:500]}")
