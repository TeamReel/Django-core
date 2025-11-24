"""Decorators for accounts app."""

from functools import wraps

from django.http import HttpResponseForbidden
from django.shortcuts import redirect


def admin_required(view_func):
    """Decorator to restrict view access to superadmins and admins only."""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("login")
        if not (request.user.is_superuser or request.user.is_admin):
            return HttpResponseForbidden("Permission denied.")
        return view_func(request, *args, **kwargs)

    return wrapper
