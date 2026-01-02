"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django_asgi_app = get_asgi_application()

from rtc_websockets import routing  # noqa: E402
from rtc_websockets.middleware import JWTAuthMiddleware  # noqa: E402


def get_allowed_origins():
    """
    Return a list of allowed origins for WebSocket connections.
    Combines CSRF_TRUSTED_ORIGINS (for production) and CORS_ALLOWED_ORIGINS (for dev/frontend).
    """
    return getattr(settings, "CSRF_TRUSTED_ORIGINS", []) + getattr(
        settings, "CORS_ALLOWED_ORIGINS", []
    )


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": OriginValidator(
            AuthMiddlewareStack(JWTAuthMiddleware(URLRouter(routing.websocket_urlpatterns))),
            get_allowed_origins(),
        ),
    }
)
