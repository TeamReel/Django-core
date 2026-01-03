import requests
import sys


def test_search():
    url = "http://localhost:8000/api/v1/search/?q=football"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            print("Search API Response:")
            # print(data) # Too verbose
            for key, items in data.items():
                print(f"Category: {key}, Count: {len(items)}")
                for item in items:
                    print(f" - {item.get('title')}")

            if data:
                print("✅ Search returned results!")
            else:
                print("⚠️ Search returned empty results")
        else:
            print(f"❌ Search API failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error connecting to Search API: {e}")


if __name__ == "__main__":
    test_search()
