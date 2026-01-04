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

## 5. Testing Resilience (Unplug Test)

The cache layer includes circuit breaker protection that gracefully handles Redis outages:

```bash
# Start the application
python manage.py runserver

# In another terminal, stop Redis
docker stop redis  # or: sudo systemctl stop redis

# Application should continue working:
# - API requests succeed (no cache, slower)
# - Circuit breaker opens after 5 failures
# - Fallback to direct DB queries
# - Logs warning: "Cache unavailable (circuit open)"

# Restart Redis
docker start redis  # or: sudo systemctl start redis

# Circuit breaker will:
# - Wait 30 seconds (timeout period)
# - Transition to HALF_OPEN state
# - Test connection with next request
# - Close circuit if successful
```

**Key Behaviors**:
- ✅ Application does NOT crash when Redis is down
- ✅ API endpoints return correct data (slower, but functional)
- ✅ Circuit breaker prevents cascade failures
- ✅ Automatic recovery when Redis comes back online
- ⚠️ Performance degrades gracefully (cache misses)

## 6. Metrics Collection

Cache performance metrics are collected every 10 minutes by Celery Beat:

```python
# Task: observability.tasks.collect_system_metrics
# Frequency: Every 10 minutes
# Retention: 7 days (automatic cleanup)
# Storage: PostgreSQL (SystemMetric model)
```

**Collected Metrics**:
- `hit_ratio`: Cache hit ratio (0.0-1.0)
- `hits`: Total cache hits since Redis restart
- `misses`: Total cache misses since Redis restart
- `memory_used_bytes`: Redis memory usage (bytes)
- `total_keys`: Total cached keys

**View Historical Data**:
Navigate to `/demo/performance` to see historical charts with dual Y-axis (hit ratio & memory usage).
