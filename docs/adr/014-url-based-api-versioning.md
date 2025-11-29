# ADR-014: URL-Based API Versioning

**Status**: Accepted  
**Date**: 2025-11-29  
**Deciders**: Core Team  
**Feature**: B13 API Foundation & Standards (WP05)

## Context

The Django Core application provides REST APIs for multiple domains (users, organisations, projects, permissions). As the application evolves, API changes may:
- Break existing client integrations
- Require backward-incompatible data model changes
- Introduce new endpoint patterns or conventions

We need a versioning strategy that:
- Allows concurrent support of multiple API versions
- Provides clear upgrade paths for clients
- Minimizes maintenance burden
- Follows industry best practices
- Integrates well with Django REST Framework and OpenAPI documentation

## Decision

We will implement **URL-based API versioning with a `/api/v{n}/` prefix** for all REST API endpoints.

### Implementation Details

1. **URL Structure**:
   ```
   /api/v1/users/              # Version 1 users endpoint
   /api/v1/organisations/      # Version 1 organisations endpoint
   /api/v2/users/              # Future version 2 (when needed)
   ```

2. **Version Prefix**: `/api/v1/`
   - All current APIs under single version namespace
   - Version number as first path segment after `/api/`
   - No unversioned endpoints (removed legacy `/api/organisations/`, `/api/projects/`)

3. **Version Discovery Endpoint** (`GET /api/v1/`):
   ```json
   {
     "version": "1.0.0",
     "endpoints": {
       "auth": {...},
       "users": "http://localhost:8000/api/v1/users/",
       "organisations": "http://localhost:8000/api/v1/organisations/",
       "projects": "http://localhost:8000/api/v1/projects/",
       "permissions": "http://localhost:8000/api/v1/permissions/"
     }
   }
   ```
   - Clients can discover available endpoints programmatically
   - Absolute URLs for easy integration
   - Version number follows semantic versioning

4. **URL Configuration**:
   ```python
   # config/urls.py
   urlpatterns = [
       path("api/v1/", include("api.v1.urls")),  # All v1 endpoints
   ]

   # api/v1/urls.py
   urlpatterns = [
       path("", api_root, name="root"),
       path("", include("accounts.api.urls")),
       path("organisations/", include("organisations.api.urls")),
       path("projects/", include("projects.api.urls")),
       path("permissions/", include("permissions.api.urls")),
   ]
   ```

5. **OpenAPI Schema Configuration**:
   ```python
   SPECTACULAR_SETTINGS = {
       "SCHEMA_PATH_PREFIX": r"/api/v1",  # Only document v1 APIs
       "VERSION": "1.0.0",
   }
   ```

6. **Version Transition Strategy**:
   - When breaking changes required, create new `api.v2` module
   - Both v1 and v2 run concurrently during transition period
   - Deprecation notices in v1 responses (via custom header or meta field)
   - Eventually remove v1 after grace period (e.g., 6 months)

## Consequences

### Positive

1. **Explicit and Clear**:
   - Version immediately visible in URL
   - No ambiguity about which API version is being used
   - Easy to communicate in documentation ("use the v1 API")

2. **Browser-Friendly**:
   - Works in browser address bar
   - Easy to bookmark and share specific versions
   - No need for custom headers in manual testing

3. **Caching and CDN Compatible**:
   - Version in URL path allows cache differentiation
   - CDN can cache different versions independently
   - No cache invalidation issues during version transitions

4. **Tool Compatibility**:
   - Works with all HTTP clients (curl, Postman, browsers)
   - OpenAPI/Swagger UI can document versioned endpoints
   - No special configuration needed in API gateways

5. **Concurrent Version Support**:
   - Multiple versions can coexist in single deployment
   - Gradual client migration without "big bang" upgrade
   - Phased rollout possible (v2 beta for select clients)

6. **Django Integration**:
   - Natural fit for Django's URL routing system
   - Clean separation of version-specific code
   - Easy to understand for Django developers

### Negative

1. **URL Length**:
   - `/api/v1/` adds 7 characters to every endpoint
   - Slightly longer URLs than unversioned approach
   - Minimal impact in practice (negligible for most clients)

2. **Code Duplication During Transitions**:
   - v1 and v2 modules may share significant code
   - Requires discipline to avoid copy-paste bugs
   - Mitigated by shared base classes and utilities

3. **Version Explosion Risk**:
   - Easy to create too many versions (v1, v2, v3...)
   - Maintenance burden grows with each version
   - Requires governance to limit active versions (max 2 recommended)

4. **No Per-Resource Versioning**:
   - All resources in same version namespace
   - Can't version individual endpoints independently
   - Must bump entire API version for any breaking change

5. **Breaking Change Definition**:
   - Requires clear policy on what constitutes "breaking"
   - Adding optional fields is usually safe
   - Removing fields or changing types requires new version

## Alternatives Considered

### 1. Header-Based Versioning

```http
GET /api/users/
Accept: application/vnd.myapp.v1+json
```

**Pros**:
- Clean URLs without version segment
- Follows REST principles more strictly
- Allows content negotiation

**Cons**:
- Not visible in URL (harder to debug)
- Requires custom headers (not browser-friendly)
- Complicates caching (need Vary header)
- Poor discoverability (can't guess API from URL)
- Not well supported by OpenAPI/Swagger UI

**Verdict**: Rejected. Complexity outweighs benefits for our use case.

### 2. Query Parameter Versioning

```
GET /api/users/?version=1
```

**Pros**:
- Backwards compatible (default version if omitted)
- Simple to implement

**Cons**:
- Version easily missed or forgotten
- Query parameters often excluded from routing
- Complicates caching (query params not always cached)
- Not idiomatic for REST APIs
- Mixes versioning with filtering/pagination params

**Verdict**: Rejected. Not a standard practice, confuses semantics.

### 3. Subdomain Versioning

```
https://api-v1.myapp.com/users/
https://api-v2.myapp.com/users/
```

**Pros**:
- Clear separation of versions
- Can deploy versions independently
- Easy to migrate infrastructure per version

**Cons**:
- Requires DNS configuration and SSL certificates per version
- CORS complications (different origins)
- Overkill for single-application deployment
- Not feasible for localhost development

**Verdict**: Rejected. Too complex for our deployment model.

### 4. No Versioning

```
GET /api/users/
```

**Pros**:
- Simplest approach
- Shorter URLs

**Cons**:
- Forces backward compatibility always
- Breaking changes require complex deprecation strategies
- Limits ability to refactor API structure
- Eventually leads to messy API with legacy cruft

**Verdict**: Rejected. Not sustainable for evolving product.

### 5. Date-Based Versioning

```
GET /api/2025-11-29/users/
```

**Pros**:
- Clear when version was introduced
- Common in some SaaS APIs (Stripe, GitHub)

**Cons**:
- Less intuitive than sequential numbers
- Implies more frequent versioning than needed
- Doesn't convey breaking vs non-breaking changes
- Requires date tracking in URLs and code

**Verdict**: Rejected. Overkill for current needs, can revisit if rapid iteration required.

## Implementation Guidelines

### When to Bump Version

**Require New Version (Breaking Changes)**:
- Removing fields from responses
- Renaming fields
- Changing field types (string → int, etc.)
- Changing response structure (envelope format change)
- Removing endpoints
- Changing HTTP methods for existing endpoints
- Changing authentication mechanisms

**Safe to Keep Same Version (Additive Changes)**:
- Adding new optional fields to responses
- Adding new endpoints
- Adding new query parameters (if optional)
- Adding new HTTP methods to existing resources
- Fixing bugs that don't change response structure
- Performance improvements

### Deprecation Process

When introducing v2:

1. **Announce Deprecation** (Time T):
   - Add `X-API-Deprecation` header to v1 responses:
     ```
     X-API-Deprecation: version=v1, sunset=2026-05-29, link=/api/v2/
     ```
   - Update documentation with migration guide
   - Send email to known API consumers

2. **Grace Period** (T to T+6 months):
   - Both v1 and v2 available
   - Monitor v1 usage via metrics
   - Provide support for migration issues

3. **Sunset Warning** (T+5 months):
   - Add `X-API-Sunset-Imminent` header
   - Final migration reminders

4. **Remove v1** (T+6 months):
   - v1 endpoints return 410 Gone
   - Or redirect to v2 with warning

### Code Organization

```
src/
  api/
    v1/
      __init__.py
      urls.py        # v1 URL routing
      views.py       # v1-specific views (discovery)
    v2/              # Future version
      __init__.py
      urls.py
      views.py
    views.py         # Shared base classes
    serializers.py   # Shared base serializers
```

- Version-specific code in version subdirectories
- Shared utilities in parent `api/` module
- Domain apps (accounts, organisations) provide versioned URL configs

## References

- [REST API Versioning Best Practices](https://www.freecodecamp.org/news/rest-api-best-practices-rest-endpoint-design-examples/)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [RFC 8594: Sunset HTTP Header](https://tools.ietf.org/html/rfc8594)
- Feature Spec: [B13 API Foundation & Standards](../../kitty-specs/013-api-foundation-standards/spec.md)
- Implementation: [WP05: v1 API Consolidation](../../kitty-specs/013-api-foundation-standards/tasks/done/WP05-v1-api-consolidation.md)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-29 | Core Team | Initial decision: URL-based versioning with `/api/v1/` prefix |
