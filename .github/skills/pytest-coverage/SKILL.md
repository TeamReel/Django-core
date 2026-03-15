---
name: pytest-coverage
description: "Generate test coverage reports for TeamReel's Django backend and React frontend — identify gaps, suggest tests, track coverage trends"
argument-hint: "App or module to check coverage for (e.g. 'organisations' or 'demo/src/hooks')"
---

# Test Coverage Analysis

Generate coverage reports and identify testing gaps in TeamReel's codebase.

## Backend Coverage (Django + pytest)

### Generate Coverage Report
```bash
cd src

# Run with coverage
pytest --cov=. --cov-report=term-missing --cov-report=html:../htmlcov

# Run for specific app
pytest --cov=organisations --cov-report=term-missing organisations/tests/

# Generate JSON report for analysis
pytest --cov=. --cov-report=json:../coverage.json
```

### Analyze Coverage Gaps
```bash
# Show files with lowest coverage
pytest --cov=. --cov-report=term-missing 2>&1 | sort -t'%' -k1 -n | head -20

# Show uncovered lines in a specific file
pytest --cov=organisations/views --cov-report=term-missing
```

### Key Areas to Cover

| Area | Priority | What to test |
|------|----------|-------------|
| ViewSets | High | Permission checks, org-scoping, CRUD operations |
| Serializers | High | Validation, read/write separation, nested data |
| Models | Medium | `__str__`, custom methods, constraints |
| Signals | Medium | Post-save hooks, cascade behavior |
| Utils | Medium | Edge cases, error handling |
| Admin | Low | Custom admin actions if any |

### Test Pattern (Django)
```python
import pytest
from rest_framework.test import APIClient
from factories import OrganisationFactory, UserFactory

@pytest.fixture
def api_client():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user

@pytest.mark.django_db
class TestResourceNameViewSet:
    def test_list_scoped_to_org(self, api_client):
        client, user = api_client
        # Create resources in user's org and another org
        own = ResourceFactory(organisation=user.organisation)
        other = ResourceFactory()  # different org
        response = client.get('/api/v1/resources/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == str(own.id)
```

## Frontend Coverage (Vitest)

### Generate Coverage Report
```bash
cd demo

# Run with coverage (if vitest configured)
npx vitest run --coverage

# Run specific test file
npx vitest run src/hooks/useActivities.test.ts
```

### Key Frontend Areas to Cover

| Area | Priority | What to test |
|------|----------|-------------|
| API adapters | High | Request/response mapping, error handling |
| Custom hooks | High | State management, API integration |
| Utility functions | Medium | Edge cases, type handling |
| Components (complex) | Medium | User interactions, conditional rendering |
| Components (simple) | Low | Snapshot only if complex logic |

## Coverage Targets

| Area | Current | Target | Notes |
|------|---------|--------|-------|
| Backend ViewSets | ? | 80% | Critical for security (org-scoping) |
| Backend Serializers | ? | 75% | Validation logic |
| Frontend adapters | ? | 70% | API contract |
| Frontend hooks | ? | 70% | Business logic |
| Overall | ? | 60% | Minimum acceptable |

## Output Format

```markdown
## Coverage Report: [scope]

### Summary
| Module | Statements | Missing | Coverage |
|--------|-----------|---------|----------|

### Uncovered Critical Paths
| File | Lines | What's not tested | Risk |
|------|-------|-------------------|------|

### Recommended Tests to Write
| # | Priority | Test | File | What it covers |
|---|----------|------|------|---------------|

### Test Commands Used
[list of commands run]
```
