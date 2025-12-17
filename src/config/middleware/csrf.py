"""
Middleware to ensure CSRF cookie is always set for SPA compatibility.

Django only sets the CSRF cookie when csrf_protect decorator is used or
when a form is rendered. For SPA applications that use sessionid cookies
for authentication, we need the CSRF cookie to be available on every response.
"""

from django.middleware.csrf import get_token


class EnsureCSRFCookieMiddleware:
    """
    Middleware that ensures CSRF cookie is set on every response.

    This is necessary for SPA applications that:
    1. Use session-based authentication (sessionid cookie)
    2. Need to make mutating requests (POST/PUT/DELETE) with CSRF protection
    3. Read the CSRF token from document.cookie (CSRF_COOKIE_HTTPONLY=False)

    Place this middleware AFTER CsrfViewMiddleware in MIDDLEWARE setting.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Call get_token to force CSRF cookie to be set
        # This marks the cookie for sending in the response
        get_token(request)

        response = self.get_response(request)
        return response
