---
applyTo: "tests/**,demo/tests/**,src/**/tests/**"
---

# Testing — TeamReel

## Backend Tests (pytest)
- Location: `src/<app>/tests/` and `tests/`
- Framework: pytest + factory_boy
- Run: `pytest` or `python -m pytest`
- Coverage target: current 892/892 tests passing, 408 test suites

### Patterns
```python
import pytest
from factories import OrganisationFactory, UserFactory

@pytest.mark.django_db
class TestMyFeature:
    def test_create_with_valid_data(self, api_client, user):
        """Test successful creation."""
        org = OrganisationFactory()
        response = api_client.post('/api/v1/resource/', {...})
        assert response.status_code == 201

    def test_rejects_unauthorized(self, api_client):
        """Test authentication required."""
        response = api_client.post('/api/v1/resource/', {...})
        assert response.status_code == 401
```

### Key Rules
- Always use `@pytest.mark.django_db` for database tests
- Use factory_boy for test data (not fixtures.json)
- Test both success and failure paths
- Test permission boundaries (org-scoped isolation)
- Mock external services (S3, AI providers, FFmpeg)

## Frontend Tests (Playwright)
- Location: `demo/tests/`
- Config: `demo/playwright.config.ts`
- Run: `npx playwright test`
- Target: 187 test files

### Patterns
```typescript
import { test, expect } from '@playwright/test';

test('dashboard loads active match', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
```

### Key Rules
- Use role-based selectors (`getByRole`, `getByLabel`)
- Test mobile viewport (375px) and desktop (1280px)
- Test light and dark themes
- Wait for network idle on data-heavy pages
- Screenshot comparison for visual regression (when applicable)

## Quality Checks Before Commit
- Backend: `pytest` passes, `mypy` clean
- Frontend: `npx tsc --noEmit` passes, `npx vite build` succeeds
- No `any` types introduced
- All interactive elements have keyboard + screen reader support
