---
work_package_id: "WP09"
subtasks: ["T063", "T064", "T065", "T066", "T067", "T068", "T069"]
title: "Organisation Notification Policies & Quiet Hours"
phase: "Phase 2 - Configuration & Policies"
lane: "planned"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
---

# WP09 – Organisation Notification Policies & Quiet Hours

## Objectives

Implement org-level policies including quiet hours rate limiting. User Story 3.

**Success**: Org with quiet hours delivers notifications at configured rate limit during quiet hours.

## Key Subtasks

- T063: Create `services/policy_service.py` with `get_org_policy()`
- T064: Quiet hours detection (check time in org timezone)
- T065: Rate limiting during quiet hours (Redis counter)
- T066: Integrate into routing flow
- T067: Timezone handling (pytz)
- T068-T069: Logging + metrics

## Implementation

- Rate limit: Redis key `rate_limit:{org_id}:{minute_bucket}` TTL 60s
- Check against `quiet_hours_rate_limit` (default 10)
- If exceeded, queue for delivery after quiet hours (Celery ETA)

## Definition of Done

- [ ] Quiet hours detected correctly in org timezone
- [ ] Rate limiting works during quiet hours
- [ ] Notifications queued for post-quiet-hours delivery

## Dependencies

- WP01 (OrganisationNotificationPolicy model)
- WP03-WP05
