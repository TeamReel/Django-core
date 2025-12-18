import pytest


@pytest.fixture(autouse=True)
def override_channel_layers(settings):
    settings.CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
