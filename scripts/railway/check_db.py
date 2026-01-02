import os
import django
from django.conf import settings

# Force local settings which uses env.db()
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

print(f"DB Engine: {settings.DATABASES['default']['ENGINE']}")
print(f"DB Host: {settings.DATABASES['default']['HOST']}")
print(f"DB Name: {settings.DATABASES['default']['NAME']}")

from django.contrib.auth import get_user_model
from organisations.models import Organisation

User = get_user_model()
print(f"Users count: {User.objects.count()}")
print(f"Orgs count: {Organisation.objects.count()}")
