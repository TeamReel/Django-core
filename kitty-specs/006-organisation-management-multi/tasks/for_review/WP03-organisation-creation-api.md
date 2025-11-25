---
work_package_id: WP03
title: Organisation Creation API (User Story 1)
lane: "for_review"
subtasks: [T015, T016, T017, T018, T019, T020, T021]
priority: P1
user_story: US1
agent: "system"
history:
  - date: 2025-11-24
    action: created
    author: spec-kitty
---

# WP03: Organisation Creation API (User Story 1)

## Objective

Implement REST API endpoints for creating organisations (POST /api/organisations/) and retrieving organisation details (GET /api/organisations/{id}/), automatically assigning creators as first admin members.

## Key Implementation Points

### T015-T016: Serializers with Validation
- Create `organisations/api/serializers.py`
- OrganisationSerializer (read): id, name, slug, description, created_at, updated_at, creator (nested), member_count, admin_count, user_role
- OrganisationCreateSerializer (write): name, description (optional)
- Validation: unique name, 3-100 chars, regex `^[a-zA-Z0-9\s\-_]+$`
- Use `validators` parameter on name field

### T017-T018: ViewSet with Creator Assignment
- Create `organisations/api/views.py` with OrganisationViewSet(ModelViewSet)
- Override `perform_create()`:
  ```python
  from django.db import transaction

  def perform_create(self, serializer):
      with transaction.atomic():
          org = serializer.save(creator=self.request.user)
          Membership.objects.create(
              user=self.request.user,
              organisation=org,
              role='admin'
          )
  ```
- Use `IsAuthenticated` permission class

### T019: Computed Fields
- Add to OrganisationSerializer:
  ```python
  member_count = serializers.SerializerMethodField()
  admin_count = serializers.SerializerMethodField()
  user_role = serializers.SerializerMethodField()

  def get_member_count(self, obj):
      return obj.memberships.filter(is_active=True).count()

  def get_admin_count(self, obj):
      return obj.memberships.filter(role='admin', is_active=True).count()

  def get_user_role(self, obj):
      user = self.context['request'].user
      membership = obj.memberships.filter(user=user, is_active=True).first()
      return membership.role if membership else None
  ```

### T020-T021: URL Configuration
- Create `organisations/api/urls.py`:
  ```python
  from rest_framework.routers import DefaultRouter
  from .views import OrganisationViewSet

  router = DefaultRouter()
  router.register('', OrganisationViewSet, basename='organisation')
  urlpatterns = router.urls
  ```
- In `src/config/urls.py`, add: `path('api/organisations/', include('organisations.api.urls'))`

## Definition of Done

- [ ] POST /api/organisations/ creates org + admin membership atomically
- [ ] GET /api/organisations/{id}/ returns org with computed counts
- [ ] Creator automatically becomes first admin
- [ ] Name validation works (unique, length, regex)
- [ ] Transaction rollback if membership creation fails
- [ ] 400 for validation errors, 201 for success

## Testing

```bash
# Create org
curl -X POST http://localhost:8000/api/organisations/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Engineering Team", "description": "Core eng"}'

# Should return 201 with org details including user_role="admin"

# Get org
curl http://localhost:8000/api/organisations/{id}/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## Dependencies

- WP02 (models must exist)

## Related Docs

- Spec: User Story 1, FR-001, FR-002, FR-016
- Contracts: [organisations-api.yaml](../contracts/organisations-api.yaml)

## Activity Log

- 2025-11-25T08:27:59Z – system – shell_pid= – lane=doing – Moved to doing
- 2025-11-25T08:30:34Z – system – shell_pid= – lane=for_review – Moved to for_review
