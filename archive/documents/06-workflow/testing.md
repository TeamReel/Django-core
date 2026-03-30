# Testing Strategy

## Philosophy

"Quality is structurally enforced, not dependent on individual skill." (Constitution 1.3)

## Test Layers

### 1. Unit Tests (Backend)
*   **Tool**: `pytest`
*   **Scope**: Individual functions, models, utility classes.
*   **Goal**: Verify logic in isolation.
*   **Coverage**: High (90%+).

### 2. Integration Tests (Backend)
*   **Tool**: `pytest-django`
*   **Scope**: API endpoints, Database interactions, Celery tasks.
*   **Goal**: Verify components work together.
*   **Rule**: Every API endpoint must have a test.

### 3. Component Tests (Frontend)
*   **Tool**: `Vitest` + `React Testing Library`
*   **Scope**: React components, Hooks.
*   **Goal**: Verify UI logic and rendering.

### 4. E2E Tests (Critical Flows)
*   **Tool**: `Playwright`
*   **Scope**: Critical user journeys (Login, Signup, Payment).
*   **Goal**: Verify the system works as a whole.

## Running Tests

```bash
# Backend
pytest

# Frontend
pnpm test
```
