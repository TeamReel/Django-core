import time

import jwt
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse


@login_required
def get_websocket_token(request):
    """
    Generate a short-lived JWT token for WebSocket authentication.
    """
    user = request.user

    # Get settings from SIMPLE_JWT or fallback to defaults
    simple_jwt_settings = getattr(settings, "SIMPLE_JWT", {})
    key = simple_jwt_settings.get("SIGNING_KEY", settings.SECRET_KEY)
    algorithm = simple_jwt_settings.get("ALGORITHM", "HS256")

    # Token valid for 5 minutes
    payload = {"user_id": user.id, "exp": int(time.time()) + 300}

    token = jwt.encode(payload, key, algorithm=algorithm)

    return JsonResponse({"token": token})
