# Research: API Foundation & Standards

**Feature**: 013-api-foundation-standards
**Date**: 2025-11-29
**Status**: Complete

## Research Questions & Findings

### Q1: JWT Authentication Library Selection

**Decision**: djangorestframework-simplejwt 5.3.1

**Rationale**:
- No existing JWT implementation in B05 (session-only authentication currently)
- B05 explicitly rejected JWT initially due to revocation concerns
- B13 requirement for stateless authentication requires JWT support
- simplejwt addresses B05's revocation concern via optional blacklist app
- Industry standard for Django + DRF projects (50k+ GitHub stars)
- Batteries-included: token obtain, refresh, verify, blacklist built-in
- Active maintenance and security updates
- Native DRF integration with JWTAuthentication class
- Supports token rotation and blacklist-after-rotation (security best practice)

**Alternatives Considered**:
- **PyJWT with custom DRF authentication**: More control but significant custom code (token generation, validation, refresh logic, blacklist management) - maintenance burden
- **django-rest-framework-jwt**: Deprecated, no longer maintained
- **Custom JWT implementation**: Violates constitution (prefer battle-tested libraries over custom crypto)

**Integration Points**:
- Dual authentication with existing SessionAuthentication (JWT takes precedence per clarification)
- Uses Django SECRET_KEY for signing (no new secrets infrastructure needed)
- Token blacklist uses existing PostgreSQL database
- Compatible with B05 User model and B08 permission system

**Configuration**:
```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
}
```

**Sources**:
- djangorestframework-simplejwt documentation
- B05 research.md (JWT rejection rationale)
- JWT best practices (token rotation, short-lived access tokens)

---

### Q2: Response Envelope Implementation Strategy

**Decision**: Custom DRF renderer + exception handler configured globally

**Rationale**:
- No external API consumers exist yet (confirmed during planning)
- B13 establishes first stable API contract
- Global enforcement ensures 100% consistency across all endpoints
- DRF's renderer architecture designed for custom response formatting
- Exception handler provides single point for error sanitization
- Simpler than per-viewset wrappers (less code, less developer error)
- Automatic application to all DRF views (ViewSets, APIView, @api_view decorators)

**Alternatives Considered**:
- **Manual envelope in each viewset**: Repetitive, error-prone, inconsistent
- **Middleware-based wrapping**: Would wrap non-API responses (admin, health checks), harder to exclude
- **v1-only scoped envelope**: Premature optimization given no existing consumers

**Response Format**:
```python
# Success
{
    "status": "success",
    "data": <payload>,
    "meta": {  # Optional
        "pagination": {...},
        "timestamp": "2025-11-29T12:00:00Z"
    }
}

# Error
{
    "status": "error",
    "error": {
        "code": "validation_error|not_found|server_error|...",
        "message": "Human-readable error message",
        "details": {...},  # Optional field-level errors
        "id": "<uuid>"  # Optional error trace ID for support
    }
}
```

**Implementation**:
- `api.renderers.EnvelopeJSONRenderer` - wraps data in envelope
- `api.exceptions.envelope_exception_handler` - standardizes error format
- Configured via `DEFAULT_RENDERER_CLASSES` and `EXCEPTION_HANDLER` settings

**Sources**:
- DRF custom renderer documentation
- API design best practices (envelope patterns)
- Clarification session (global enforcement approved)

---

### Q3: API Versioning Architecture

**Decision**: Hybrid - version-agnostic viewsets in domain apps, versioned routers in central `src/api/v1/`

**Rationale**:
- Clean separation of concerns: domain logic vs routing/versioning
- Domain apps (accounts, organisations, projects) remain product-agnostic
- Versioning handled at routing layer (easy to add v2 without duplicating business logic)
- Existing viewsets can be reused in v1 without modification
- Future version changes isolated to router configuration
- Follows DRF patterns (ViewSets registered with routers)

**Alternatives Considered**:
- **Centralized `src/api/` with version subdirectories duplicating viewsets**: Code duplication for each version
- **Each domain app provides versioned API modules**: Versioning concerns leak into domain apps
- **No versioning structure**: Harder to introduce v2 later; breaking changes harder to manage

**URL Structure**:
```
/api/v1/users/              → accounts.api.views.UserViewSet
/api/v1/organisations/      → organisations.api.views.OrganisationViewSet
/api/v1/projects/           → projects.api.views.ProjectViewSet
/api/v1/permissions/roles/  → permissions.api.views.RoleViewSet
```

**Directory Structure**:
```
src/api/
├── v1/
│   ├── urls.py       # Central router registering domain viewsets
│   └── views.py      # API root, version discovery
└── ...               # Global API components (renderers, auth, etc.)

src/accounts/api/
├── views.py          # Version-agnostic UserViewSet
└── serializers.py    # Version-agnostic serializers

src/organisations/api/
├── views.py          # Version-agnostic OrganisationViewSet
└── serializers.py
```

**Migration Strategy**:
- Existing URL patterns (`/api/organisations/`, `/api/projects/`) consolidated under `/api/v1/`
- Legacy URLs removed (no external consumers to break)
- Future v2 can coexist with v1 during migration period

**Sources**:
- DRF versioning documentation
- API versioning best practices
- Planning discussion (hybrid approach approved)

---

### Q4: OpenAPI Documentation Tool Selection

**Decision**: drf-spectacular 0.27.0

**Rationale**:
- Modern, actively maintained (regular releases)
- OpenAPI 3.0 support (drf-yasg is OpenAPI 2.0 primarily)
- Better DRF 3.14+ integration and support
- Automatic schema generation from serializers/viewsets
- Interactive Swagger UI + ReDoc included
- Supports custom schema extensions (for envelope format documentation)
- Better type hint integration for more accurate schemas
- Community standard for new DRF projects

**Alternatives Considered**:
- **drf-yasg**: Older, OpenAPI 2.0 focus, less active development
- **DRF's built-in schema generation**: Basic, no UI, requires significant custom work

**Features Needed**:
- Automatic schema generation from DRF serializers
- Interactive API documentation at `/api/docs/`
- OpenAPI schema download at `/api/schema/`
- Envelope format documentation
- JWT authentication documentation (Bearer token input in UI)
- Request/response examples

**Configuration**:
```python
SPECTACULAR_SETTINGS = {
    "TITLE": "Django Core API",
    "DESCRIPTION": "Product-agnostic Django core application API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    "COMPONENT_SPLIT_REQUEST": True,
}
```

**Sources**:
- drf-spectacular documentation
- OpenAPI 3.0 specification
- DRF community recommendations

---

### Q5: Rate Limiting Implementation

**Decision**: DRF's SimpleRateThrottle subclasses backed by Redis cache

**Rationale**:
- DRF-native approach (integrates with view/viewset classes)
- Automatic rate limit header injection (X-RateLimit-Remaining, X-RateLimit-Reset)
- Uses existing Django cache backend (B06's Redis configuration)
- Simple to configure per-endpoint or globally
- Supports different rates for authenticated vs anonymous users
- No additional dependencies (built into DRF)
- Clean separation: throttle logic separate from business logic

**Alternatives Considered**:
- **django-ratelimit**: Decorator-based, less DRF-integrated, no automatic headers
- **Custom Redis rate limiting**: More control but reinvents DRF's wheel, more code to maintain

**Implementation**:
```python
# api/throttling.py
class AuthenticatedUserThrottle(SimpleRateThrottle):
    scope = "authenticated"
    rate = "100/min"  # Per specification

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return f"throttle_user_{request.user.id}"
        return None

class AnonymousUserThrottle(SimpleRateThrottle):
    scope = "anonymous"
    rate = "10/min"  # Per specification

    def get_cache_key(self, request, view):
        return self.get_ident(request)  # IP-based
```

**Rate Limits (from specification clarifications)**:
- Authenticated users: 100 requests per minute (per user ID)
- Anonymous requests: 10 requests per minute (per IP address)
- Configurable per endpoint via throttle_classes attribute

**Redis Integration**:
- Uses existing `CACHES["default"]` from B06 (django-redis)
- Rate limit keys stored with TTL matching window (60 seconds for per-minute limits)
- No additional Redis configuration needed

**Headers**:
- `X-RateLimit-Limit`: Total quota
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when quota resets
- `Retry-After`: Seconds until retry allowed (on 429 response)

**Sources**:
- DRF throttling documentation
- B06 Redis cache configuration
- Rate limiting best practices

---

## Technology Stack Summary

### New Dependencies

| Package | Version | Purpose | Justification |
|---------|---------|---------|---------------|
| djangorestframework-simplejwt | 5.3.1 | JWT authentication | Industry standard, blacklist support, active maintenance |
| drf-spectacular | 0.27.0 | OpenAPI 3.0 docs | Modern, best DRF 3.14+ integration |

### Existing Infrastructure Leveraged

- **Django 5.1.4**: Web framework
- **djangorestframework 3.14.0**: API framework
- **django-redis 5.4.0**: Rate limiting cache backend (B06)
- **PostgreSQL**: Token blacklist storage, primary database
- **django-prometheus**: Metrics collection (existing)
- **B05 User model**: Authentication backend
- **B08 Permissions**: Authorization integration
- **B09 Audit**: API access logging integration

---

## Integration Architecture

### Authentication Flow

```
Request → JWT or Session?
  ├─ JWT present? → JWTAuthentication (precedence)
  │   ├─ Valid + user active? → Authenticated
  │   ├─ Valid + user inactive? → 403 Forbidden
  │   └─ Invalid/expired? → 401 Unauthorized
  └─ Session cookie? → SessionAuthentication (fallback)
      ├─ Valid session? → Authenticated
      └─ No session? → 401 Unauthorized
```

### Response Processing Pipeline

```
ViewSet/APIView execution
  ↓
Success → EnvelopeJSONRenderer
  ↓
{"status": "success", "data": <result>, "meta": {...}}

Exception → envelope_exception_handler
  ↓
{"status": "error", "error": {<formatted_error>}}
```

### Rate Limiting Flow

```
Request → Throttle check (before view execution)
  ├─ Authenticated? → AuthenticatedUserThrottle (100/min per user)
  └─ Anonymous? → AnonymousUserThrottle (10/min per IP)
      ├─ Under limit? → Proceed + inject headers
      └─ Over limit? → 429 Too Many Requests + Retry-After header
```

---

## Open Questions / Deferred Decisions

*None - all planning questions answered during discovery phase*

---

## Security Considerations

1. **JWT Secret Management**: Uses Django SECRET_KEY (already secure); rotation requires new SECRET_KEY deployment
2. **Token Blacklist Growth**: Tokens stored until expiry; cleanup job needed for expired blacklist entries (can use django-clearsessions pattern)
3. **Rate Limit Bypass**: Redis must be secured; rate limit keys not user-controllable
4. **CORS Configuration**: Configured per environment via CORS_ALLOWED_ORIGINS environment variable
5. **Inactive Account Handling**: JWT validation includes user.is_active check (FR-005a)

---

## Performance Considerations

1. **JWT Validation**: Stateless (no database hit) except for blacklist check (cached in Redis)
2. **Pagination**: Offset-based default (20 items, max 100) - acceptable for most use cases; cursor pagination available for large datasets
3. **N+1 Queries**: BaseAPIPagination documents select_related/prefetch_related patterns
4. **Rate Limit Overhead**: Redis lookup per request (microseconds) - negligible
5. **Envelope Overhead**: Minimal JSON wrapping (< 1ms)

---

## Testing Strategy

### Unit Tests
- Envelope renderer (success/error cases)
- JWT authentication (valid/invalid/expired/blacklisted tokens)
- Rate throttling (under/over limit, header injection)
- Exception handler (all error types, sanitization)

### Integration Tests
- End-to-end authentication flows (login, refresh, blacklist)
- Rate limiting enforcement across multiple requests
- Permission integration (B08)
- Audit logging integration (B09)

### API Contract Tests
- OpenAPI schema validation
- Response envelope format consistency
- Error format standardization

---

## Migration Plan

### Phase 1: Infrastructure (B13 Core)
1. Create `src/api/` Django app
2. Implement envelope renderer + exception handler
3. Configure JWT authentication (simplejwt)
4. Implement rate limiting throttle classes
5. Configure drf-spectacular

### Phase 2: v1 API Consolidation
1. Create `src/api/v1/urls.py` central router
2. Register existing viewsets:
   - accounts.api.views (users, auth)
   - organisations.api.views
   - projects.api.views
   - permissions.api.views
3. Update `config/urls.py` to route `/api/v1/` to v1 router
4. Remove legacy non-versioned API URLs

### Phase 3: Testing & Documentation
1. Update existing API tests to expect envelope responses
2. Add JWT authentication tests
3. Add rate limiting tests
4. Generate OpenAPI schema
5. Write developer documentation (quickstart, extension guide)

---

## Success Metrics

- ✅ All API responses follow envelope format
- ✅ JWT authentication working with 15min/7day token lifecycle
- ✅ Rate limiting enforced (100/min auth, 10/min anon)
- ✅ OpenAPI schema generated and accessible at `/api/docs/`
- ✅ All existing API tests passing with envelope format
- ✅ Zero unauthorized access incidents (permission integration)
- ✅ API response times < 200ms for paginated lists
- ✅ 1000 concurrent requests handled without degradation
