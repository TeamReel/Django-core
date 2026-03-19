# B44: API Keys & OAuth Apps

**Priority:** ❌ Te vroeg
**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 329
**Category:** Backend

## Description

## 284. B44 – API Keys & OAuth Apps

**Doel**: Third-party app registratie, API key management, en OAuth2 provider functionaliteit.

**Waarom agnostisch**: Developer platforms, API toegang, en machine-to-machine auth zijn universeel.

**Wat moet er gebeuren**:
- **APIKey model**:
  - Fields: key (hashed), prefix (visible), name, scopes, expires_at
  - Owner: user or organisation
  - Rate limits: requests_per_minute, requests_per_day
  - Usage tracking: last_used_at, total_requests
- **OAuthApplication model**:
  - Fields: client_id, client_secret (hashed), name, redirect_uris
  - Grant types: authorization_code, client_credentials, refresh_token
  - Scopes: read, write, admin (configurable per app)
- **Key generation**:
  - Secure random generation (32+ bytes)
  - Prefix for identification (e.g., "tr_live_", "tr_test_")
  - One-time display of full key on creation
- **Authentication middleware**:
  - API key in header: `X-API-Key: tr_live_xxx`
  - OAuth2 bearer token support
  - Scope validation per endpoint
- **Rate limiting**:
  - Per-key limits (Redis-based)
  - 429 response with Retry-After header
- **Key lifecycle**:
  - Rotation: create new, deprecate old
  - Revocation: immediate invalidation
  - Expiration: auto-disable after date
- **Integration**: B03 (security), B09 (audit), B25 (cache/Redis)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/api-keys/` - List user's API keys
- `POST /api/v1/api-keys/` - Create new key (returns full key once)
- `DELETE /api/v1/api-keys/{id}/` - Revoke key
- `POST /api/v1/api-keys/{id}/rotate/` - Rotate key
- `GET /api/v1/oauth/applications/` - List OAuth apps
- `POST /api/v1/oauth/applications/` - Register OAuth app
- `POST /api/v1/oauth/token/` - OAuth token endpoint

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B44-api-keys-and-oauth-apps

[feature summary]
Third-party app registration, API key management, and OAuth2 provider functionality for developer platform.

[goals]
- APIKey model with hashed key, prefix, scopes, rate limits
- OAuthApplication model with client credentials flow
- Secure key generation with one-time display
- Authentication middleware for X-API-Key header
- Redis-based rate limiting per key
- Key lifecycle: rotation, revocation, expiration

[non-goals]
- Full OAuth2 authorization code flow with consent screen
- API key marketplace/developer portal UI
- Monetization/billing per API key

[dependencies]
- B03 (security headers)
- B09 (audit logging)
- B25 (Redis for rate limiting)

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```

## Notes
<!-- Add progress notes here -->

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
