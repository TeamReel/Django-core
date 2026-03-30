# Permission Testing Guide

> **Herbruikbare patronen voor het testen van role-based access control (RBAC) in de API.**

Last updated: 2026-03-21

## Overzicht

TeamReel heeft een hiërarchisch permissiesysteem:

```
Organisation
  └── Club Project (parent_project = NULL)
        └── Team Project (parent_project = club)
```

Elke gebruiker heeft een `ProjectMembership` met een rol (`admin`, `editor`, `viewer`) op een specifiek project. **Hiërarchie werkt alleen naar beneden**: een Club Admin kan team-video's goedkeuren, maar een Team Admin kan NIET bij club-level resources.

Zie [permission-layers.md](permission-layers.md) voor een uitgebreide uitleg van de drie permissielagen.

## Test Matrix Template

Gebruik deze matrix bij het testen van elke nieuwe endpoint met RBAC:

```
┌─────────────────┬───────────────┬──────────┬───────────────┬────────────────────┐
│ User             │ Membership    │ Action   │ HTTP Expected │ Business Expected  │
├─────────────────┼───────────────┼──────────┼───────────────┼────────────────────┤
│ Direct Admin     │ project       │ action   │ 200           │ ✅ Success         │
│ Direct Editor    │ project       │ action   │ 200           │ ✅ Success         │
│ Direct Viewer    │ project       │ action   │ 200           │ ⚠️ Depends        │
│ Club Admin       │ parent        │ action   │ 200           │ ✅ Success         │
│ Club Editor      │ parent        │ action   │ 200           │ ✅ Success         │
│ Club Viewer      │ parent        │ action   │ 200           │ ⚠️ Depends        │
│ Team→Club        │ child only    │ action   │ 404           │ ❌ Blocked         │
│ Non-member       │ none          │ action   │ 404           │ ❌ Blocked         │
│ Anonymous        │ n/a           │ action   │ 401           │ ❌ Blocked         │
└─────────────────┴───────────────┴──────────┴───────────────┴────────────────────┘
```

**Let op**: Queryset filtering geeft 404 (niet 403) als de gebruiker geen toegang heeft — het object bestaat simpelweg niet in de gefilterde set.

## Code Patronen

### Test Setup Helpers

```python
from django.apps import apps

def _make_user(django_user_model, email: str):
    """Create an active user."""
    return django_user_model.objects.create_user(
        username=email.split("@")[0],
        email=email,
        password="testpass123",
        is_active=True,
    )

def _add_membership(user, project, role: str):
    """Add project membership with specified role."""
    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    return ProjectMembership.objects.create(
        user=user, project=project, role=role, deleted_at=None
    )
```

### Fixture Patroon: Club + Team Hiërarchie

```python
@pytest.fixture
def org(db):
    from organisations.models import Organisation
    from tests.accounts.factories import UserFactory
    creator = UserFactory(is_active=True, email_verified=True)
    return Organisation.objects.create(name="Test Club", slug="test-club", creator=creator)

@pytest.fixture
def club_project(db, org):
    from projects.models import Project
    return Project.objects.create(
        name="Club", slug="club", organisation=org,
        creator=org.creator, parent_project=None,
    )

@pytest.fixture
def team_project(db, org, club_project):
    from projects.models import Project
    return Project.objects.create(
        name="Team A", slug="team-a", organisation=org,
        creator=org.creator, parent_project=club_project,
    )
```

### Test Categorieën

Organiseer tests in drie klassen:

```python
@pytest.mark.django_db
class TestDirectMembership:
    """Gebruiker is lid van het project zelf."""
    def test_admin_can_action(self): ...
    def test_editor_can_action(self): ...
    def test_viewer_limited(self): ...

@pytest.mark.django_db
class TestHierarchyAccess:
    """Club-lid acteert op team-level resource."""
    def test_club_admin_can_action_on_team(self): ...
    def test_club_viewer_limited_on_team(self): ...

@pytest.mark.django_db
class TestAccessBoundaries:
    """Niet-leden en anoniem worden geblokkeerd."""
    def test_team_admin_cannot_access_club(self): ...
    def test_non_member_blocked(self): ...
    def test_anonymous_blocked(self): ...
```

### Workflow Transition Verificatie

Bij endpoints die een workflow triggeren, controleer BEIDE lagen:

```python
def test_admin_approves_with_workflow_transition(self):
    """Admin kan approven EN workflow transitie gaat door."""
    # ... setup ...
    response = api_client.post(url)

    # Laag 2: HTTP toegang
    assert response.status_code == 200

    # Laag 3: Workflow daadwerkelijk getransitioneerd
    job.workflow_instance.refresh_from_db()
    assert job.workflow_instance.current_state == "approved"

def test_viewer_gets_200_but_workflow_blocked(self):
    """Viewer kan endpoint bereiken maar workflow transitie faalt."""
    # ... setup ...
    response = api_client.post(url)

    # Laag 2: HTTP OK (viewer IS een member)
    assert response.status_code == 200

    # Laag 3: Workflow NIET getransitioneerd (viewer niet in permissions)
    job.workflow_instance.refresh_from_db()
    assert job.workflow_instance.current_state == "ready_for_review"  # unchanged!
```

## Referentie: Video Approval Tests

Volledige werkend voorbeeld: `tests/video/test_approval_permissions.py`

Dit bestand test 12 scenario's voor de video approve/reject endpoints:
- 4 directe membership tests (admin, editor, viewer, reject)
- 4 hiërarchie tests (club admin/editor/viewer approve, club admin reject)
- 1 upward hierarchy test (team → club blocked)
- 3 boundary tests (non-member, anonymous, reject)

## Checklist voor Nieuwe Endpoints

Bij het toevoegen van een nieuw endpoint met RBAC:

- [ ] `IsProjectMember` permission class op de ViewSet
- [ ] Queryset filtert op toegankelijke projecten (inclusief parent projecten)
- [ ] Test met minimaal: admin, viewer, non-member, anonymous
- [ ] Als hiërarchie relevant is: test club→team en team→club
- [ ] Als workflow gekoppeld: test transition success + denial voor elke rol
- [ ] Soft-delete check: `deleted_at__isnull=True` in membership queries

## Gerelateerde docs

- [permission-layers.md](permission-layers.md) — De 3-laags permissieketen
- [../features/rbac-permissions.md](../features/rbac-permissions.md) — RBAC datamodel
- [../features/project-hierarchy.md](../features/project-hierarchy.md) — Project hiërarchie & membership
