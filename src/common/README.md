# Common (Shared Utilities)

**Status**: ✅ Complete
**Location**: `src/common/`

## Purpose

Provides shared utilities and infrastructure components used across all Core-App modules.

## Scope

**✅ Included**:
- Health check endpoint for system monitoring
- Translation logging for debugging i18n issues
- Domain-agnostic helper functions
- Shared type definitions and constants

**❌ Excluded** (Product-Agnostic Constraint):
- Product-specific business logic
- Domain-specific utilities
- Application-level configuration

## Key Components

### Health Check
- **`health_check(request)`**: Minimal health check endpoint returning JSON `{"status": "ok"}`

### Translation Logging
- **`translation_logging.py`**: Debug utilities for i18n translation lookup

### Type Definitions
- **`py.typed`**: PEP 561 marker indicating module supports type checking

## Public Interface

**Safe to Import** (Stable API):
```python
from common.health import health_check
from common.translation_logging import log_translation_request
```

**Internal Use Only** (May change):
```python
# No internal-only utilities at this time
```

## Integration Example

**Health Check Endpoint**:
```python
# urls.py
from django.urls import path
from common.health import health_check

urlpatterns = [
    path("health/", health_check, name="health-check"),
]
```

**Translation Debugging**:
```python
from common.translation_logging import log_translation_request

# Debug translation lookup issues
log_translation_request(key="my.translation.key", language="en")
```

## Related Modules

**Dependencies** (This module requires):
- None - intentionally dependency-free

**Used By** (Modules that depend on this):
- All modules - shared utilities available to entire codebase

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Health Checks**:
   ```python
   # your_product/health.py
   from common.health import health_check as base_health_check
   from django.http import JsonResponse

   def extended_health_check(request):
       """Add product-specific health checks."""
       base_response = base_health_check(request)
       # Add custom checks
       return JsonResponse({
           **base_response.data,
           "database": check_database(),
           "cache": check_cache(),
       })
   ```

2. **Custom Translation Logging**:
   ```python
   # your_product/logging.py
   from common.translation_logging import log_translation_request

   def custom_translation_handler(key, language, context=None):
       """Add product-specific translation logging."""
       log_translation_request(key, language)
       # Add custom logging/tracking
   ```

## Configuration

**Required Settings**:
```python
# settings.py
# No required settings - module works out of the box
```

**Environment Variables**:
```bash
# No environment variables required
```

**Optional Settings**:
```python
# settings.py (optional)
TRANSLATION_LOGGING_ENABLED = True  # Enable debug logging for i18n
```

## Testing

**Run Module Tests**:
```bash
pytest tests/common/ -v
```

**Key Test Coverage**:
- ✅ Health check endpoint returns 200 with valid JSON
- ✅ Translation logging captures expected data
- ✅ No external dependencies required

## References

- **API Docs**: Health check endpoint at `/health/`
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: Health check returns 500 error
   - **Cause**: Django settings misconfiguration
   - **Solution**: Check `ALLOWED_HOSTS` and `DEBUG` settings

2. **Issue**: Translation logging not showing output
   - **Cause**: `TRANSLATION_LOGGING_ENABLED` not set
   - **Solution**: Enable in settings or check log level configuration

## Migration Notes

**Breaking Changes**:
- None - module stable since initial release

**Deprecations**:
- None
