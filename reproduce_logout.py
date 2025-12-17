import requests
import json

BASE_URL = "http://localhost:8000/api/v1"


def test_logout():
    # 1. Login to get tokens
    print("Logging in...")
    login_url = f"{BASE_URL}/auth/login/"
    credentials = {"email": "admin@example.com", "password": "admin"}

    try:
        response = requests.post(login_url, json=credentials)
        print(f"Login Status: {response.status_code}")

        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return

        data = response.json()
        # Note: The login endpoint in accounts/api/views.py returns user info but NOT the JWT tokens directly in the body?
        # Wait, let's check the login response structure in accounts/api/views.py
        print(f"Login Response Keys: {data.keys()}")

        # The LoginSerializer/View in accounts/api/views.py uses Session Auth (auth_login)
        # It does NOT seem to return JWT tokens unless it's using SimpleJWT's view?
        # But src/api/v1/urls.py maps /auth/token/ to TokenObtainPairView.
        # The demo-shell uses /api/v1/auth/login/ which maps to accounts.api.views.login_api

        # Let's check cookies for sessionid
        cookies = response.cookies
        print(f"Cookies: {cookies.get_dict()}")

        if "sessionid" not in cookies:
            print("WARNING: No sessionid cookie received!")

        # 2. Logout
        print("\nLogging out...")
        logout_url = f"{BASE_URL}/auth/logout/"

        # We need to send the session cookie
        # And potentially CSRF token
        csrf_token = cookies.get("csrftoken")
        headers = {}
        if csrf_token:
            headers["X-CSRFToken"] = csrf_token
            print(f"Using CSRF Token: {csrf_token}")

        # The LogoutView in src/api/views.py expects a refresh token in body for JWT blacklist
        # But handles it gracefully if missing.
        # It calls logout(request) to clear session.

        logout_response = requests.post(logout_url, cookies=cookies, headers=headers, json={})
        print(f"Logout Status: {logout_response.status_code}")
        print(f"Logout Response: {logout_response.text}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    test_logout()
