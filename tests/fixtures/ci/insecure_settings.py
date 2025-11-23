"""WP14-T128: Insecure Django settings fixture for CI testing.

This file contains deliberately insecure Django settings for testing
the security baseline validation rules. DO NOT use in production.
"""

# Security Violations for Testing

# SEC001-DEBUG-MODE: DEBUG enabled (CRITICAL)
DEBUG = True

# SEC002-SECRET-KEY: Weak secret key (CRITICAL)
SECRET_KEY = "insecure"

# SEC003-ALLOWED-HOSTS: Wildcard allowed hosts (CRITICAL)
ALLOWED_HOSTS = ["*"]

# SEC004-SESSION-COOKIE-SECURE: Session cookie not secure (HIGH)
SESSION_COOKIE_SECURE = False

# SEC005-SESSION-COOKIE-HTTPONLY: Session cookie not HttpOnly (HIGH)
SESSION_COOKIE_HTTPONLY = False

# SEC006-SESSION-COOKIE-SAMESITE: No SameSite protection (HIGH)
SESSION_COOKIE_SAMESITE = None

# SEC007-CSRF-COOKIE-SECURE: CSRF cookie not secure (HIGH)
CSRF_COOKIE_SECURE = False

# SEC008-CSRF-COOKIE-HTTPONLY: CSRF cookie not HttpOnly (HIGH)
CSRF_COOKIE_HTTPONLY = False

# SEC009-CSRF-MIDDLEWARE: Missing CSRF middleware (HIGH)
MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
    # Missing: 'django.middleware.csrf.CsrfViewMiddleware'
]

# SEC010-HSTS-HEADER: HSTS disabled (HIGH)
SECURE_HSTS_SECONDS = 0

# SEC011-CONTENT-TYPE-NOSNIFF: Content-Type sniffing allowed (MEDIUM)
SECURE_CONTENT_TYPE_NOSNIFF = False

# SEC012-X-FRAME-OPTIONS: No clickjacking protection (MEDIUM)
X_FRAME_OPTIONS = None

# SEC013-XSS-FILTER: XSS filter disabled (MEDIUM)
SECURE_BROWSER_XSS_FILTER = False

# SEC014-CSP-HEADER: Unsafe CSP with unsafe-inline (HIGH)
CSP_DEFAULT_SRC = ["'self'", "'unsafe-inline'", "'unsafe-eval'"]

# SEC015-SSL-REDIRECT: No SSL redirect (HIGH)
SECURE_SSL_REDIRECT = False

# SEC016-DATABASE-SSL: Database without SSL (CRITICAL)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "testdb",
        "USER": "testuser",
        "PASSWORD": "testpass",  # noqa: S105 - test fixture
        "HOST": "localhost",
        "PORT": "5432",
        # Missing: OPTIONS with sslmode
    }
}

# SEC017-PASSWORD-LENGTH: Weak password validators (HIGH)
AUTH_PASSWORD_VALIDATORS = [
    # Missing: MinimumLengthValidator with min_length=12
]

# SEC018-PASSWORD-COMPLEXITY: No complexity validator (MEDIUM)
# Missing: UserAttributeSimilarityValidator

# SEC019-PASSWORD-SIMILARITY: No similarity check (MEDIUM)
# Missing: CommonPasswordValidator

# SEC020-PASSWORD-BREACH: No breach detection (HIGH)
# Missing: PwnedPasswordsValidator

# Additional insecure configurations
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_REFERRER_POLICY = None
