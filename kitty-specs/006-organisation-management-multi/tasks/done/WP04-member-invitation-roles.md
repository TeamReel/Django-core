---
work_package_id: WP04
title: Member Invitation & Role Assignment (User Story 2)
lane: "done"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
subtasks: [T022, T023, T024, T025, T026, T027]
priority: P2
user_story: US2
agent: "system"
assignee: "claude"
shell_pid: "11524"
history:
  - date: 2025-11-24
    action: created
    author: spec-kitty
---

# WP04: Member Invitation & Role Assignment (User Story 2)

## Objective

Implement nested API endpoints for admins to invite members (POST /api/organisations/{id}/members/) and list members (GET), with admin-only permission enforcement.

## Key Implementation Points

### T022: Custom Permission Class
- Create `organisations/permissions.py`:
  ```python
  from rest_framework import permissions

  class IsOrganisationAdmin(permissions.BasePermission):
      def has_permission(self, request, view):
          org_id = view.kwargs.get('organisation_pk')
          return Membership.objects.filter(
              user=request.user,
              organisation_id=org_id,
              role='admin',
              is_active=True
          ).exists()
  ```

### T023-T024: Membership Serializers & ViewSet
- MembershipSerializer: id, user (nested with id/username/email), organisation (nested minimal), role, joined_at, invited_by (nested)
- MembershipCreateSerializer: user_id, role
- MembershipViewSet(ModelViewSet) with nested routing
- Filter queryset by organisation_pk

### T025-T026: Duplicate Prevention & invited_by
- In MembershipCreateSerializer.validate():
  ```python
  def validate(self, attrs):
      org_id = self.context['view'].kwargs['organisation_pk']
      if Membership.objects.filter(
          user=attrs['user_id'],
          organisation_id=org_id
      ).exists():
          raise serializers.ValidationError("User already member")
      return attrs
  ```
- Override `perform_create()`: `serializer.save(invited_by=self.request.user)`

### T027: Nested URL Routing
- Use drf-nested-routers or manual patterns:
  ```python
  path('api/organisations/<uuid:organisation_pk>/members/',
       MembershipViewSet.as_view({'get': 'list', 'post': 'create'}))
  ```

## Definition of Done

- [ ] POST /api/organisations/{id}/members/ creates membership (admin only)
- [ ] GET /api/organisations/{id}/members/ lists members (any member can view)
- [ ] Duplicate invites return 409 Conflict
- [ ] Non-admin requests return 403 Forbidden
- [ ] invited_by field populated correctly

## Dependencies

- WP03 (organisation creation must work)

## Related Docs

- Spec: User Story 2, FR-006, FR-009
- Contracts: POST/GET /members/ endpoints

## Activity Log

- 2025-11-25T08:35:32Z – system – shell_pid= – lane=doing – Moved to doing
- 2025-11-25T08:38:04Z – system – shell_pid= – lane=for_review – Moved to for_review
- 2025-11-25T08:40:53Z – system – shell_pid= – lane=done – Moved to done
- 2025-11-25T08:40:53Z – claude-reviewer – shell_pid=11524 – lane=done – Review complete: Approved without changes. All Definition of Done items verified.
