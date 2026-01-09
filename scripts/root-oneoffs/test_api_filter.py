import requests

API_BASE = "https://api.teamreel.app"

# Test 1: Zonder filter (alle active users)
print("=== Test 1: Alle active users (geen filter) ===")
response = requests.get(
    f"{API_BASE}/api/v1/admin/users/?limit=50&offset=0&is_active=true",
    headers={"Cookie": ""},  # Add your session cookie here if needed
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    results = data.get("data", {}).get("results", data.get("results", []))
    print(f"Users returned: {len(results)}")
    print(f"Total count: {data.get('data', {}).get('count', data.get('count', 0))}")
    if results:
        print(f"First user: {results[0].get('email', 'N/A')}")
else:
    print(f"Error: {response.text[:200]}")

print("\n=== Test 2: Filter op project_id=12 (SC Heerenveen) ===")
response = requests.get(
    f"{API_BASE}/api/v1/admin/users/?limit=50&offset=0&project_id=12&is_active=true",
    headers={"Cookie": ""},
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    results = data.get("data", {}).get("results", data.get("results", []))
    print(f"Users returned: {len(results)}")
    print(f"Total count: {data.get('data', {}).get('count', data.get('count', 0))}")
    if results:
        print(f"First user: {results[0].get('email', 'N/A')}")
else:
    print(f"Error: {response.text[:200]}")

print("\n=== Test 3: Filter op project_id=9 (NEC) ===")
response = requests.get(
    f"{API_BASE}/api/v1/admin/users/?limit=50&offset=0&project_id=9&is_active=true",
    headers={"Cookie": ""},
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    results = data.get("data", {}).get("results", data.get("results", []))
    print(f"Users returned: {len(results)}")
    print(f"Total count: {data.get('data', {}).get('count', data.get('count', 0))}")
    if results:
        print(f"First user: {results[0].get('email', 'N/A')}")
        # Show projects for first user
        projects = results[0].get("projects", [])
        print(f"First user's projects: {[p.get('name') for p in projects]}")
else:
    print(f"Error: {response.text[:200]}")

# Test 4: Check database directly what NEC's ID is
print("\n=== Test 4: Check NEC in database ===")
import psycopg2

DATABASE_URL = (
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Find NEC
cur.execute(
    """
    SELECT id, name, parent_project_id
    FROM projects_project
    WHERE name LIKE '%NEC%'
    ORDER BY name
"""
)
nec_projects = cur.fetchall()
print("NEC projects in database:")
for proj in nec_projects:
    print(f"  - ID: {proj[0]}, Name: {proj[1]}, Parent: {proj[2]}")

# Count users for NEC team
cur.execute(
    """
    SELECT COUNT(DISTINCT user_id)
    FROM projects_membership pm
    JOIN projects_project p ON pm.project_id = p.id
    WHERE p.name LIKE '%NEC%' AND p.parent_project_id IS NOT NULL
"""
)
nec_user_count = cur.fetchone()[0]
print(f"\nUsers in NEC teams: {nec_user_count}")

conn.close()
