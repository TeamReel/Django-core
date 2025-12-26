#!/usr/bin/env python
"""Test script to verify notifications API."""

import requests

# Test login first
session = requests.Session()

# Get CSRF token
csrf_response = session.get("http://localhost:8000/api/v1/auth/csrf/")
csrf_token = csrf_response.cookies.get("csrftoken")

login_response = session.post(
    "http://localhost:8000/api/v1/auth/login/",
    json={
        "email": "admin@example.com",
        "password": "admin123",
    },
    headers={"X-CSRFToken": csrf_token} if csrf_token else {},
)
print(f"Login status: {login_response.status_code}")
if login_response.status_code == 200:
    print(f"Login response: {login_response.json()}")

# Now test notifications endpoint
notifications_response = session.get("http://localhost:8000/api/v1/user-notifications/")
print(f"\nNotifications status: {notifications_response.status_code}")
if notifications_response.status_code == 200:
    data = notifications_response.json()
    print(f"Found {data.get('count', 0)} notifications")
    if data.get("results"):
        print("\nFirst notification:")
        notif = data["results"][0]
        print(f"  ID: {notif['id']}")
        print(f"  Title: {notif['title']}")
        print(f"  Read: {notif['is_read']}")
else:
    print(f"Error: {notifications_response.text}")

# Test toggle read status
if notifications_response.status_code == 200 and data.get("results"):
    first_notif_id = data["results"][0]["id"]
    current_status = data["results"][0]["is_read"]

    print(f"\n--- Testing toggle (current: {current_status}) ---")
    toggle_response = session.patch(
        f"http://localhost:8000/api/v1/user-notifications/{first_notif_id}/",
        json={"is_read": not current_status},
    )
    print(f"Toggle status: {toggle_response.status_code}")
    if toggle_response.status_code == 200:
        updated = toggle_response.json()
        print(f"Updated is_read: {updated['is_read']}")
        print(f"✅ Toggle successful: {current_status} → {updated['is_read']}")
    else:
        print(f"❌ Toggle failed: {toggle_response.text}")
