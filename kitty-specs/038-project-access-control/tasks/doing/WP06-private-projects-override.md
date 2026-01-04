---
work_package_id: WP06
title: Private Projects & Override (US3, US5)
lane: "doing"
subtasks: [T033, T034, T035, T036, T037]
priority: P2
estimated_effort: 2 days
dependencies: [WP02]
agent: "GitHub Copilot"
shell_pid: "22952"
---

# WP06: Private Projects & Override (US3, US5)

## Objective
Enforce private project access rules with emergency override for org admins.

## Key Deliverables
- Update PermissionResolutionService for private logic (T033)
- Emergency override audit logging (T034)
- B10 feature flag integration (T035)
- Frontend: Privacy toggle in project settings (T036)
- Frontend: Override banner (T037)

## Private Project Logic
```python
if project.is_private and not explicit_membership:
    if is_org_admin and override_flag_enabled:
        log_audit_event('project.private_access_override')
        return 'admin' (source: emergency_override)
    else:
        return 'no_access'
```

## Feature Flags
- `project_access_control.private_projects` (default: True)
- `project_access_control.org_admin_override` (default: True)

## Override Rate Limiting
- Max 5 overrides per day per admin
- Prevent abuse, monitor frequency

## Warning Modal
Before making project private:
- Count affected users (org members without explicit membership)
- Show warning: "{X} users will lose automatic access. Continue?"
- Require confirmation

## Success Criteria
- Private projects deny implicit access
- Org admins can override with audit trail
- Warning shown before making private

## Activity Log

- 2026-01-04T20:15:00Z – GitHub Copilot – shell_pid=22952 – lane=doing – Started implementation
- Feature flags allow strict mode
