"""Account views — barrel re-export for backward compatibility.

All views have been split into focused modules:
- views_auth.py — register, login, logout, email verification, password reset
- views_context.py — auth_me, default context, active context
- views_profile.py — profile update, password change, avatar
- views_admin.py — admin user management, roles, activation

This file re-exports everything so existing imports continue to work.
"""

# ── Auth ─────────────────────────────────────────────────────────────
# ── Admin ────────────────────────────────────────────────────────────
from .views_admin import (  # noqa: F401
    UserPagination,
    admin_update_avatar,
    admin_user_list,
)
from .views_admin_detail import (  # noqa: F401
    admin_change_role,
    admin_user_activate,
    admin_user_deactivate,
    admin_user_detail,
    admin_user_reset_password,
)
from .views_auth import (  # noqa: F401
    LogoutView,
    login_api,
    logout_api,
    password_reset_confirm_api,
    password_reset_request_api,
    register_api,
    verify_email_api,
)

# ── Context ──────────────────────────────────────────────────────────
from .views_context import (  # noqa: F401
    auth_default_context,
    auth_me,
)
from .views_context_active import auth_active_context  # noqa: F401

# ── Profile ──────────────────────────────────────────────────────────
from .views_profile import (  # noqa: F401
    change_password,
    set_avatar_from_path,
    update_avatar,
    update_profile,
)
