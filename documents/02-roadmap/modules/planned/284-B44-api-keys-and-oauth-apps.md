# B44: API Keys & OAuth Apps

**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 284
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

## Notes
<!-- Add progress notes here -->
