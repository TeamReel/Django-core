# Core (Base Infrastructure)

**Status**: ✅ Complete
**Location**: `src/core/`

## Purpose

Provides foundational infrastructure and base utilities for the Django Core-App framework.

## Scope

**✅ Included**:
- Cache management utilities
- Core infrastructure components
- Base utilities for cross-cutting concerns
- Type definitions and shared interfaces

**❌ Excluded** (Product-Agnostic Constraint):
- Business logic or domain models
- Feature-specific functionality
- Product-specific utilities

## Key Components

### Cache
- **`cache/`**: Cache management utilities and abstractions

### Type Definitions
- **`py.typed`**: PEP 561 marker for type checking support

## Public Interface

**Safe to Import** (Stable API):
```python
from core.cache import get_cache_key, cache_decorator
```

**Internal Use Only** (May change):
```python
# Module currently minimal - all components are internal infrastructure
```

## Integration Example

**Cache Usage**:
```python
from core.cache import get_cache_key
from django.core.cache import cache

# Generate consistent cache keys
cache_key = get_cache_key("model", "user", user_id=123)

# Use with Django cache
cache.set(cache_key, data, timeout=3600)
result = cache.get(cache_key)
```

## Related Modules

**Dependencies** (This module requires):
- None - foundational infrastructure layer

**Used By** (Modules that depend on this):
- All feature modules - provides core infrastructure

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Cache Backends**:
   ```python
   # your_product/cache.py
   from core.cache import get_cache_key

   def custom_cache_key(prefix, *args, **kwargs):
       """Add product-specific cache key logic."""
       base_key = get_cache_key(prefix, *args, **kwargs)
       return f"product:{base_key}"
   ```

2. **Infrastructure Extensions**:
   ```python
   # your_product/infrastructure.py
   from core import BaseInfrastructure

   class CustomInfrastructure(BaseInfrastructure):
       """Extend core infrastructure for product needs."""
       pass
   ```

## Configuration

**Required Settings**:
```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
    }
}
```

**Environment Variables**:
```bash
CACHE_URL=redis://localhost:6379/1  # Cache backend URL
```

**Optional Settings**:
```python
# settings.py (optional)
CACHE_MIDDLEWARE_SECONDS = 600  # Cache timeout in seconds
CACHE_MIDDLEWARE_KEY_PREFIX = "core"  # Prefix for cache keys
```

## Testing

**Run Module Tests**:
```bash
pytest tests/core/ -v
```

**Key Test Coverage**:
- ✅ Cache key generation consistency
- ✅ Infrastructure component initialization
- ✅ Utility function behavior

## References

- **Django Cache Framework**: https://docs.djangoproject.com/en/stable/topics/cache/
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: Cache not working
   - **Cause**: Cache backend not configured or unavailable
   - **Solution**: Check `CACHES` setting and verify cache service is running

2. **Issue**: Cache key collisions
   - **Cause**: Insufficient namespace separation
   - **Solution**: Use `CACHE_MIDDLEWARE_KEY_PREFIX` or add custom prefixes

## Migration Notes

**Breaking Changes**:
- None - module stable since initial release

**Deprecations**:
- None
