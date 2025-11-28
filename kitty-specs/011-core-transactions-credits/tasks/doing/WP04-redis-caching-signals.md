---
work_package_id: "WP04"
subtasks: ["T040", "T041", "T042", "T043", "T044", "T045", "T046", "T047", "T048"]
title: "Redis Caching & Signals"
phase: "Phase 1 - Performance"
lane: "doing"
assignee: ""
agent: "claude-assistant"
shell_pid: "17932"
history:
  - timestamp: "2025-11-28T00:00:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package: WP04 – Redis Caching & Signals

## Objectives

Configure django-redis as cache backend, implement balance caching (60s TTL), and add post_save signal for cache invalidation.

## Key Configuration

**settings/base.py**:
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'django_core',
        'TIMEOUT': 60,
    }
}
```

**Cache Keys**:
- `balance:org:{organization_id}` (60s TTL)
- `balance:proj:{project_id}` (60s TTL)

**Invalidation Trigger**: post_save signal on Transaction model (in signals.py)

## Test Requirements

- Cache hit/miss tests
- Cache invalidation tests (verify cache cleared after transaction write)
- Concurrent write tests (10 threads, verify no data loss)

## Dependencies

WP01 (Transaction model), WP02 (service layer)

## Definition of Done

- [ ] Redis configured in settings
- [ ] Signals connected in apps.py ready()
- [ ] Cache tests pass
- [ ] Concurrent write tests pass (10 threads, 0 errors)

Commands:
```bash
pytest transactions/tests/ -k cache -v
pytest transactions/tests/ -k concurrent -v
```

## Activity Log

- 2025-11-28 – system – lane=planned – Prompt created
- 2025-11-28T19:10:15Z – claude-assistant – shell_pid=17932 – lane=doing – Started implementation: Redis caching and signal-based cache invalidation
