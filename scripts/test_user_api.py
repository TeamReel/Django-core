import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.serializers import UserListSerializer
from accounts.models import User


def test_user_serializer():
    # Get first few users
    users = User.objects.all()[:5]

    print(f"\n--- Testing UserListSerializer ---")
    print(f"Found {users.count()} users\n")

    for user in users:
        serializer = UserListSerializer(user)
        data = serializer.data

        print(f"User: {data['first_name']} {data['last_name']}")
        print(f"  Email: {data['email']}")
        print(f"  Role: {data['role']}")
        print(f"  Organisations: {json.dumps(data['organisations'], indent=4)}")
        print()


if __name__ == "__main__":
    test_user_serializer()
