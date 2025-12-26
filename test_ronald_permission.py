"""Test permission check for Ronald Koeman with the dark mode feature flag."""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from settings.models import FeatureFlag
from settings.permissions import ScopeAwarePermission
from organisations.models import Organisation
from unittest.mock import Mock

User = get_user_model()
user = User.objects.get(email="ronald.koeman@nederland.nl")
flag = FeatureFlag.objects.get(id="54fb24ea-7753-4084-bedd-3040af4ac45c")

print(f"User: {user.email}")
print(f"User roles:")
for role in user.roles.all():
    print(f"  - {role.role} in org {role.organisation_id}")

print(f"\nFlag: {flag.key}")
print(f"Flag scope: {flag.scope_type}")
print(f"Flag org: {flag.organisation_id}")

if flag.organisation_id:
    flag_org = Organisation.objects.get(id=flag.organisation_id)
    print(f"Flag org name: {flag_org.name}")

request = Mock()
request.user = user
request.method = "PATCH"

perm = ScopeAwarePermission()
try:
    result = perm.has_object_permission(request, None, flag)
    print(f"\nhas_object_permission result: {result}")
except Exception as e:
    print(f"\nPermission check raised exception: {e}")
