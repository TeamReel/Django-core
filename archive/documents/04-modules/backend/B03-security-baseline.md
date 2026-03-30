# B03: Security Baseline

## 1. Purpose & Responsibility
The **Security Baseline** module enforces core security practices across the application.

**Responsibilities:**
*   **CSP (Content Security Policy):** Prevents XSS attacks.
*   **Security Headers:** HSTS, X-Frame-Options, X-Content-Type-Options.
*   **Secrets Management:** Environment variable validation.
*   **CSRF Protection:** Token-based protection for state-changing requests.

## 2. Domain-Agnostic Rationale
Security must be baked in, not bolted on. This module provides:
*   **Defense in Depth:** Multiple layers of protection.
*   **Django Hardening:** Secure defaults for Django settings.
*   **Compliance Ready:** Supports SOC2, ISO27001 requirements.

## 3. Key Concepts

### 3.1 Content Security Policy (CSP)
HTTP header that restricts resource loading:
```
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com
```

### 3.2 Security Headers Middleware
Automatically adds security headers to all responses:
*   `Strict-Transport-Security`: Force HTTPS.
*   `X-Frame-Options`: Prevent clickjacking.
*   `X-Content-Type-Options`: Prevent MIME sniffing.

### 3.3 Secrets Validation
Startup checks ensure required environment variables are set:
*   `SECRET_KEY`
*   `DATABASE_URL`
*   `ALLOWED_HOSTS`

## 4. Public Interfaces

### Django Settings (`config/settings/production.py`)
```python
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
```

### Middleware (`src/security_baseline/middleware.py`)
Automatically applied to all requests.

## 5. Integrations & Dependencies
*   **All Modules:** Security baseline applies globally.
*   **Deployment (B19):** Enforced in production settings.

## 6. Status & Phase History
*   **Phase:** 1 (Foundation)
*   **Status:** ✅ Complete
*   **Source Code:** `src/security_baseline/`
