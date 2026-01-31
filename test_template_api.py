import requests

# Test de API met sport filter - Correct production backend URL
url = "https://api.teamreel.app/api/v1/content-generation/templates/"
params = {
    'is_active': 'true',
    'sport': '15'  # Football 11v11
}

response = requests.get(url, params=params)
print(f"Status: {response.status_code}")
print(f"URL: {response.url}")
print(f"Response text: {response.text[:500]}")
print()

if response.status_code == 200:
    try:
        data = response.json()
    except:
        print("Failed to parse JSON. Full response:")
        print(response.text)
        exit()

    results = data.get('results', [])
    print(f"Total templates returned: {len(results)}")
    print()

    for t in results:
        print(f"ID: {t['id']}")
        print(f"  Name: {t['name']}")
        print(f"  Type/Subtype: {t['template_type']}/{t['template_subtype']}")
        print(f"  Sport: {t.get('sport_detail', {}).get('name', 'None')}")
        print()
else:
    print(f"Error: {response.text}")
