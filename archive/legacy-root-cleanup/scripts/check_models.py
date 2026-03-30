
import os
import django
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from google import genai

api_key = getattr(settings, "GOOGLE_API_KEY", None)
if not api_key:
    print("No API key found")
    exit(1)

client = genai.Client(api_key=api_key)
try:
    # List models that support video generation or just list all
    models = client.models.list()
    print("Available models:")
    for m in models:
        # Check if it supports video generation or has 'veo' in name
        if 'veo' in m.name.lower() or 'video' in m.name.lower():
            print(f"- {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")
