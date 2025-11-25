---
work_package_id: WP07
title: Rate Limiting & Observability
lane: "for_review"
subtasks: [T039, T040, T041, T042, T043, T044, T045]
priority: Critical
user_story: All
agent: "claude"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - date: 2025-11-24
    action: created
    author: spec-kitty
---

# WP07: Rate Limiting & Observability

## Objective

Implement Redis-backed rate limiting (5 orgs/user/day, 20 invites/org/hour) and Prometheus metrics for monitoring.

## Key Implementation Points

### T039-T042: Rate Limiting
- Create `organisations/ratelimit.py`:
  ```python
  from django.core.cache import cache
  from django.utils import timezone

  def check_rate_limit(key, limit, window_seconds):
      current = cache.get(key, 0)
      if current >= limit:
          ttl = cache.ttl(key)
          return False, 0, timezone.now().timestamp() + ttl

      if current == 0:
          cache.set(key, 1, window_seconds)
      else:
          cache.incr(key)

      remaining = limit - (current + 1)
      reset_time = timezone.now().timestamp() + window_seconds
      return True, remaining, reset_time
  ```

- In OrganisationViewSet.create():
  ```python
  from rest_framework.exceptions import Throttled

  def create(self, request, *args, **kwargs):
      key = f"ratelimit:org_create:{request.user.id}:{timezone.now().date()}"
      allowed, remaining, reset = check_rate_limit(key, 5, 86400)  # 24 hours

      if not allowed:
          raise Throttled(wait=reset - timezone.now().timestamp())

      response = super().create(request, *args, **kwargs)
      response['X-RateLimit-Limit'] = '5'
      response['X-RateLimit-Remaining'] = str(remaining)
      response['X-RateLimit-Reset'] = str(int(reset))
      return response
  ```

### T043-T045: Prometheus Metrics
- Create `organisations/metrics.py`:
  ```python
  from prometheus_client import Counter, Gauge, Histogram

  org_count = Gauge('organisations_total', 'Total organisations')
  membership_count = Gauge('memberships_total', 'Total memberships')
  org_creations = Counter('organisation_creations_total', 'Org creation events')
  member_invitations = Counter('member_invitations_total', 'Member invitations')
  rate_limit_hits = Counter('rate_limit_hits_total', 'Rate limit violations', ['endpoint'])
  ```

- Create `organisations/signals.py`:
  ```python
  from django.db.models.signals import post_save, post_delete
  from django.dispatch import receiver
  from .models import Organisation, Membership
  from .metrics import org_count, membership_count, org_creations

  @receiver(post_save, sender=Organisation)
  def update_org_metrics(sender, instance, created, **kwargs):
      if created:
          org_creations.inc()
      org_count.set(Organisation.objects.active().count())

  @receiver(post_delete, sender=Organisation)
  def update_org_count(sender, instance, **kwargs):
      org_count.set(Organisation.objects.active().count())
  ```

- Connect signals in `apps.py`:
  ```python
  def ready(self):
      import organisations.signals
  ```

## Definition of Done

- [ ] Creating 6 orgs in 24h returns 429
- [ ] 21 invites in 1h returns 429
- [ ] Rate limit headers in responses
- [ ] /metrics shows org_count, membership_count, etc.
- [ ] Metrics update via signals

## Dependencies

- WP02 (models), WP03-WP04 (APIs)

## Related Docs

- Research: Q2 (rate limiting), Q3 (metrics)
- Spec: FR-025 through FR-032

## Activity Log

- 2025-11-25T09:37:55Z – claude – shell_pid= – lane=doing – Started implementation
- 2025-11-25T09:42:15Z – claude – shell_pid= – lane=for_review – Implementation complete: Added rate limiting (5 orgs/user/day, 20 invites/org/hour) and Prometheus metrics (org_count, membership_count, counters)
