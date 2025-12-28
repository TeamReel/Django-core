import requests
import json

try:
    # Try to fetch from the running backend
    response = requests.get("http://localhost:8000/api/v1/contextual-notifications/routing-logs/")
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print("Response JSON keys:", data.keys())
        if "data" in data:
            print("data.data keys:", data["data"].keys())
            if "results" in data["data"]:
                print("Number of results:", len(data["data"]["results"]))
    except Exception as e:
        print(f"JSON decode error: {e}")
        print("Response text:", response.text[:200])
except Exception as e:
    print(f"Connection error: {e}")
