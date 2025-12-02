---
work_package_id: "WP05"
subtasks: ["T033", "T034", "T035", "T036", "T037", "T038", "T039", "T040"]
title: "Suppression Service & Redis Integration"
phase: "Phase 1 - Core Routing"
lane: "planned"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
---

# WP05 – Suppression Service & Redis Integration

## Objectives

Implement duplicate notification suppression using Redis cache with TTL. Prevent repeated notifications for same (user, event_type, resource_id) within configurable window.

**Success**: Repeated events for same resource are suppressed; only first notification passes.

## Key Subtasks

- T033: Create `services/suppression_service.py` with `check_suppression()` and `record_suppression()`
- T034: Redis key format: `suppression:{user_id}:{event_type}:{resource_id}`
- T035: Atomic check with `cache.add()` (SETNX pattern)
- T036: Configure TTL (default 300 seconds)
- T037: Graceful degradation if Redis unavailable
- T038-T040: Type hints, logging, metrics

## Implementation

- Use django-redis cache backend (configured by B10)
- Atomic: `cache.add(key, timestamp, timeout=300)` returns False if exists
- Suppression scope: per (user_id, event_type, resource_id)
- If Redis fails: log warning, proceed without suppression

## Definition of Done

- [ ] Duplicate events are suppressed correctly
- [ ] Atomic Redis operations prevent race conditions
- [ ] Redis failure handled gracefully

## Dependencies

- B10 (django-redis configured)
- WP03, WP04 (routing + preference services)
