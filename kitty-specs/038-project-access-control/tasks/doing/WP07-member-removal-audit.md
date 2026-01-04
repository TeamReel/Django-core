---
work_package_id: WP07
title: Member Removal & Audit (US6)
lane: "doing"
subtasks: [T038, T039, T040, T041, T042]
priority: P2
estimated_effort: 1-2 days
dependencies: [WP03]
agent: "GitHub Copilot"
---

# WP07: Member Removal & Audit (US6)

## Objective
Soft delete members with audit trail and last admin protection.

## Key Deliverables
- Update MembershipService.remove_member() with last admin check (T038)
- B09 audit event for removal (T039)
- Frontend: Remove action with confirmation (T040)
- Frontend: Activity log viewer tab (T041)
- Management command for cleanup (T042)

## Last Admin Protection
```python
active_admins = ProjectMembership.objects.filter(
    project=project,
    role='admin',
    deleted_at__isnull=True
).count()

if active_admins <= 1 and removing_last_admin:
    # Per clarification: Auto-assign org admin
    org_admin = project.organisation.get_admin()
    ProjectMembership.objects.create(
        project=project,
        user=org_admin,
        role='admin',
        assignment_reason='org_default'
    )
```

## Soft Delete Pattern
```python
membership.deleted_at = timezone.now()
membership.save()
cache_service.invalidate_user_project_permissions(user_id, project_id)
audit_logger.log_event('project.membership.deleted', ...)
```

## Cleanup Command
```bash
python manage.py cleanup_deleted_memberships --days=90
```
- Hard delete memberships where deleted_at < 90 days ago
- Run monthly via cron job

## Success Criteria
- Cannot remove last admin (auto-assign fallback)
- Soft delete preserves audit history
- Activity log visible in UI
- Cleanup command works correctly

## Activity Log

- 2026-01-04T20:39:00Z – GitHub Copilot – shell_pid= – lane=doing – Started implementation
- 2026-01-04T21:55:00Z – GitHub Copilot – shell_pid=22952 – lane=doing – Completed implementation
