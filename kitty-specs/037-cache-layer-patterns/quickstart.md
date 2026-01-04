# Quickstart: Cache Layer & Patterns

## 1. Configuration

Ensure Redis is running and configured in `.env`:
```bash
REDIS_URL=redis://localhost:6379/0
```

## 2. Using the Decorator

```python
from core.cache.decorators import cache_result

@cache_result(key_pattern="user:{user_id}:profile", ttl=300, tags=["user:{user_id}"])
def get_user_profile(user_id):
    # Expensive DB query
    return User.objects.get(id=user_id)
```

## 3. Invalidating Tags

```python
from core.cache.services import CacheService

# Invalidate all keys tagged with "user:123"
CacheService.invalidate_tags(["user:123"])
```

## 4. Viewing Metrics

1. Start the development server: `python manage.py runserver`
2. Start Celery Beat (for history): `celery -A config beat -l info`
3. Navigate to: `http://localhost:8000/demo/performance`
