"""Middleware for session inactivity timeout."""

from django.contrib.auth import logout
from django.http import JsonResponse
from django.utils import timezone


class SessionInactivityMiddleware:
    """Enforce 24-hour inactivity timeout for authenticated sessions."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.inactive_timeout = 86400  # 24 hours in seconds

    def __call__(self, request):
        if hasattr(request, "user") and request.user.is_authenticated:
            last_activity = request.session.get("last_activity")
            if last_activity:
                inactive_seconds = timezone.now().timestamp() - last_activity
                if inactive_seconds > self.inactive_timeout:
                    logout(request)
                    if request.path.startswith("/api/"):
                        return JsonResponse(
                            {
                                "error": "session_expired",
                                "message": "Your session has expired due to inactivity.",
                            },
                            status=401,
                        )
            # Update last activity timestamp
            request.session["last_activity"] = timezone.now().timestamp()
        return self.get_response(request)
