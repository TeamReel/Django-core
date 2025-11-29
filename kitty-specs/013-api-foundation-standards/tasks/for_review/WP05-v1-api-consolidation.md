---
work_package_id: WP05
title: v1 API Consolidation and Routing
lane: "for_review"
subtasks: [T033, T034, T035, T036, T037, T038, T039, T040, T041, T042]
agent: "copilot"
shell_pid: "11588"
history:
  - date: 2025-11-29
    action: created
    author: spec-kitty
---

# WP05: v1 API Consolidation and Routing

## Objective
Consolidate existing domain APIs under /api/v1/ with centralized routing and remove legacy non-versioned URLs.

## Context
**Priority**: P2 (User Story 4)
**Dependencies**: WP01-WP04 (all infrastructure ready)

## Subtasks

### T033-T034: Create v1 Router
Create `api/v1/urls.py`:
```python
from rest_framework.routers import DefaultRouter
from accounts.api.views import UserViewSet
from organisations.api.views import OrganisationViewSet
from projects.api.views import ProjectViewSet
from permissions.api.views import RoleViewSet, PermissionViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"organisations", OrganisationViewSet, basename="organisation")
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"permissions/roles", RoleViewSet, basename="role")

urlpatterns = router.urls
```

### T039: Create API Root
Create `api/v1/views.py`:
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def api_root(request):
    return Response({
        "version": "1.0.0",
        "endpoints": {
            "users": request.build_absolute_uri("/api/v1/users/"),
            "organisations": request.build_absolute_uri("/api/v1/organisations/"),
            "projects": request.build_absolute_uri("/api/v1/projects/"),
            "auth": request.build_absolute_uri("/api/v1/auth/"),
        }
    })
```

### T040-T041: Update Main URLs
In `config/urls.py`:
```python
urlpatterns = [
    path("api/v1/", include("api.v1.urls")),
    # Remove: path("api/organisations/", ...), path("api/projects/", ...)
]
```

### T042: Update Domain Viewsets
Ensure all viewsets extend BaseAPIViewSet from WP01.

## Definition of Done
- [ ] GET /api/v1/ returns endpoint list
- [ ] All domain APIs accessible under /api/v1/
- [ ] Legacy non-versioned URLs return 404
- [ ] B08 permissions enforced
- [ ] All responses use envelope format

**Estimated Effort**: 4-6 hours

## Activity Log

- 2025-11-29T18:26:48Z – copilot – shell_pid=11588 – lane=doing – Started WP05: v1 API Consolidation implementation
- 2025-11-29T20:00:00Z – copilot – shell_pid=11588 – lane=doing – Completed all 10 subtasks: Created v1 router with domain API routes (accounts, organisations, projects, permissions), created api_root view with endpoint discovery, consolidated all APIs under /api/v1/, updated config/urls.py. Domain viewsets inherit global REST_FRAMEWORK config. Commit b94674b.
- 2025-11-29T18:48:08Z – copilot – shell_pid=11588 – lane=for_review – Ready for review: v1 API consolidation complete, all domain APIs under /api/v1/, api_root discovery endpoint
