import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from notifications.models import RetryPolicy

p = RetryPolicy.objects.filter(name="critical").first()
if p:
    print(f"Critical Policy: {p.name}")
    print(f"  Max Attempts: {p.max_attempts}")
    print(f"  Window: {p.retry_window_seconds}s ({p.retry_window_seconds/3600:.1f}h)")
    print(f"  Backoff: {p.backoff_strategy} (multiplier: {p.backoff_multiplier})")
    print(f"  Initial Delay: {p.initial_delay_seconds}s ({p.initial_delay_seconds/60:.1f}m)")
else:
    print("Critical policy NOT FOUND")
