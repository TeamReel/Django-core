---
work_package_id: WP06
title: Organisation Viewing & Updates (User Stories 4-5)
lane: "for_review"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
subtasks: [T033, T034, T035, T036, T037, T038]
priority: P4-P5
user_story: US4, US5
agent: "claude"
shell_pid: "11524"
history:
  - date: 2025-11-24
    action: created
    author: spec-kitty
---

# WP06: Organisation Viewing & Updates (User Stories 4-5)

## Objective

Filter organisation list to user's memberships, add pagination, enable profile updates for admins.

## Key Implementation Points

### T033-T034: List Filtering & Optimization
- Override get_queryset():
  ```python
  def get_queryset(self):
      return Organisation.objects.filter(
          memberships__user=self.request.user,
          memberships__is_active=True,
          is_active=True
      ).select_related('creator').prefetch_related('memberships').distinct()
  ```

### T035: Admin-Only Updates
- Use permission_classes conditionally:
  ```python
  def get_permissions(self):
      if self.action in ['update', 'partial_update', 'destroy']:
          return [IsAuthenticated(), IsOrganisationAdmin()]
      return [IsAuthenticated()]
  ```

### T036: Pagination
- Add to settings or viewset:
  ```python
  pagination_class = PageNumberPagination
  page_size = 20
  ```

### T037-T038: List vs Detail Serializers
- OrganisationListSerializer (minimal): id, name, slug, member_count, user_role
- OrganisationDetailSerializer (full): all fields + creator + counts
- Override get_serializer_class():
  ```python
  def get_serializer_class(self):
      if self.action == 'list':
          return OrganisationListSerializer
      return OrganisationDetailSerializer
  ```

## Definition of Done

- [ ] GET /api/organisations/ returns only user's orgs
- [ ] List uses pagination (20 per page)
- [ ] No N+1 queries (verify with django-debug-toolbar)
- [ ] PATCH /api/organisations/{id}/ updates name/description (admin only)
- [ ] List uses lighter serializer

## Dependencies

- WP03 (organisation API exists)

## Related Docs

- Spec: User Stories 4-5, FR-012, FR-013

## Activity Log

- 2025-11-25T09:21:39Z – claude – shell_pid=11524 – lane=doing – Started implementation
- 2025-11-25T09:33:25Z – claude – shell_pid=11524 – lane=doing – Completed implementation
- 2025-11-25T09:27:25Z – claude – shell_pid=11524 – lane=for_review – Ready for review
