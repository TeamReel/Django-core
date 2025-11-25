---
work_package_id: WP05
title: Membership Management (User Story 3)
lane: "for_review"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
subtasks: [T028, T029, T030, T031, T032]
priority: P3
user_story: US3
agent: "claude"
shell_pid: "11524"
history:
  - date: 2025-11-24
    action: created
    author: spec-kitty
---

# WP05: Membership Management (User Story 3)

## Objective

Implement PATCH /api/organisations/{id}/members/{user_id}/ for role changes and DELETE for member removal, with last-admin protection.

## Key Implementation Points

### T028: Admin Count Helper
- Add to Organisation model (if not in WP02):
  ```python
  def get_admin_count(self):
      return self.memberships.filter(role='admin', is_active=True).count()
  ```

### T029-T030: Last-Admin Validation
- In MembershipViewSet.update():
  ```python
  def update(self, request, *args, **kwargs):
      membership = self.get_object()
      new_role = request.data.get('role')

      if membership.role == 'admin' and new_role == 'member':
          if membership.organisation.get_admin_count() <= 1:
              raise ValidationError("Cannot demote last admin")

      return super().update(request, *args, **kwargs)
  ```
- Similar check in destroy() for admin deletion

### T031: Self-Removal Prevention
- In destroy():
  ```python
  if membership.user == request.user and membership.role == 'admin':
      if membership.organisation.get_admin_count() <= 1:
          raise ValidationError("Last admin cannot leave")
  ```

### T032: Audit Logging (if B09 available)
- Use Django signals to log events:
  ```python
  from django.db.models.signals import post_save, pre_delete

  @receiver(post_save, sender=Membership)
  def log_role_change(sender, instance, created, **kwargs):
      if not created:  # Update
          # Log to audit system
          pass
  ```

## Definition of Done

- [ ] PATCH changes membership role (admin only)
- [ ] DELETE removes membership (admin only)
- [ ] Last admin cannot be demoted or removed (409 Conflict)
- [ ] Members can remove themselves (leave org)
- [ ] Audit logs record changes

## Dependencies

- WP04 (membership creation must work)

## Related Docs

- Spec: User Story 3, FR-007, FR-008, FR-010, FR-011

## Activity Log

- 2025-11-25T08:50:39Z – claude – shell_pid=11524 – lane=doing – Started implementation
- 2025-11-25T09:06:16Z – claude – shell_pid=11524 – lane=doing – Completed implementation
- 2025-11-25T09:13:35Z – claude – shell_pid=11524 – lane=for_review – Ready for review
