# Testing

This guide documents the testing practices, patterns, and requirements for Django Core-App.

## Overview

We use **pytest** with **pytest-django** for testing. All code changes require tests, and we maintain a minimum 80% coverage requirement.

---

## Test Framework

### Core Dependencies

```bash
pytest                # Test framework
pytest-django         # Django integration
pytest-cov            # Coverage reporting
pytest-xdist          # Parallel test execution
factory-boy           # Test data factories
```

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific app tests
pytest tests/accounts/

# Run specific test file
pytest tests/accounts/test_api.py

# Run specific test function
pytest tests/accounts/test_api.py::test_user_login

# Run tests matching a pattern
pytest -k "login"

# Run in parallel (faster)
pytest -n auto
```

---

## Test Structure

Tests mirror the source code structure:

```
tests/
├── __init__.py
├── conftest.py              # Global fixtures
├── accounts/
│   ├── __init__.py
│   ├── conftest.py          # App-specific fixtures
│   ├── test_api.py          # API endpoint tests
│   ├── test_models.py       # Model tests
│   └── test_services.py     # Service layer tests
├── permissions/
│   ├── test_api.py
│   ├── test_models.py
│   └── test_services.py
├── fixtures/                 # Shared test data
│   └── *.json
└── ...
```

---

## Writing Tests

### Test File Naming

- Test files: `test_<module>.py`
- Test classes: `Test<Feature>`
- Test functions: `test_<behavior>`

### Test Structure (AAA Pattern)

```python
def test_user_can_create_organisation(authenticated_client, user):
    """Test that an authenticated user can create an organisation."""
    # Arrange
    data = {
        "name": "Acme Corp",
        "description": "A test organisation",
    }
    
    # Act
    response = authenticated_client.post("/api/v1/organisations/", data)
    
    # Assert
    assert response.status_code == 201
    assert response.data["name"] == "Acme Corp"
    assert Organisation.objects.filter(name="Acme Corp").exists()
```

### Class-Based Tests

```python
import pytest


class TestUserAuthentication:
    """Test suite for user authentication flows."""
    
    def test_login_with_valid_credentials(self, client, user):
        """Test successful login with valid credentials."""
        response = client.post("/api/v1/auth/login/", {
            "email": user.email,
            "password": "testpass123",
        })
        assert response.status_code == 200
        assert "access" in response.data
    
    def test_login_with_invalid_password(self, client, user):
        """Test login failure with wrong password."""
        response = client.post("/api/v1/auth/login/", {
            "email": user.email,
            "password": "wrongpassword",
        })
        assert response.status_code == 401
    
    def test_login_with_nonexistent_user(self, client):
        """Test login failure for unknown user."""
        response = client.post("/api/v1/auth/login/", {
            "email": "nobody@example.com",
            "password": "anypassword",
        })
        assert response.status_code == 401
```

---

## Database Access

### Marking Tests

Tests that need database access must be marked:

```python
import pytest


@pytest.mark.django_db
def test_create_user():
    """Test user creation in database."""
    user = User.objects.create_user(
        email="test@example.com",
        password="testpass123",
    )
    assert user.pk is not None
```

### Transaction Tests

For tests that need transaction control:

```python
@pytest.mark.django_db(transaction=True)
def test_concurrent_balance_update():
    """Test concurrent balance updates with transactions."""
    ...
```

---

## Fixtures

### Common Fixtures

In `tests/conftest.py`:

```python
import pytest
from rest_framework.test import APIClient

from accounts.models import User


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        email="testuser@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
    )


@pytest.fixture
def client():
    """Create an API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(client, user):
    """Create an authenticated API client."""
    client.force_authenticate(user=user)
    return client
```

### Factory Boy

For complex test data, use factories:

```python
import factory
from factory.django import DjangoModelFactory

from accounts.models import User
from organisations.models import Organisation


class UserFactory(DjangoModelFactory):
    """Factory for creating test users."""
    
    class Meta:
        model = User
    
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")


class OrganisationFactory(DjangoModelFactory):
    """Factory for creating test organisations."""
    
    class Meta:
        model = Organisation
    
    name = factory.Sequence(lambda n: f"Organisation {n}")
    owner = factory.SubFactory(UserFactory)
```

Usage:

```python
def test_organisation_member_count(db):
    """Test member counting."""
    org = OrganisationFactory()
    UserFactory.create_batch(5)  # Create 5 users
    
    # Add members...
    assert org.member_count == 5
```

---

## API Testing

### DRF APIClient

```python
from rest_framework.test import APIClient


def test_list_organisations(authenticated_client, organisation):
    """Test listing organisations."""
    response = authenticated_client.get("/api/v1/organisations/")
    
    assert response.status_code == 200
    assert len(response.data["results"]) >= 1


def test_create_organisation(authenticated_client):
    """Test creating an organisation."""
    data = {"name": "New Org", "description": "A new org"}
    
    response = authenticated_client.post("/api/v1/organisations/", data)
    
    assert response.status_code == 201
    assert response.data["name"] == "New Org"


def test_update_organisation(authenticated_client, organisation):
    """Test updating an organisation."""
    response = authenticated_client.patch(
        f"/api/v1/organisations/{organisation.id}/",
        {"name": "Updated Name"},
    )
    
    assert response.status_code == 200
    assert response.data["name"] == "Updated Name"
```

### Testing Permissions

```python
def test_non_member_cannot_access(client, user, other_user, organisation):
    """Test that non-members cannot access organisation."""
    # other_user is not a member of organisation
    client.force_authenticate(user=other_user)
    
    response = client.get(f"/api/v1/organisations/{organisation.id}/")
    
    assert response.status_code == 403
```

---

## Mocking

### unittest.mock

```python
from unittest.mock import Mock, patch


def test_send_welcome_email():
    """Test that welcome email is sent on registration."""
    with patch("accounts.services.send_email") as mock_send:
        mock_send.return_value = True
        
        user = register_user("new@example.com", "password123")
        
        mock_send.assert_called_once()
        assert "Welcome" in mock_send.call_args[1]["subject"]
```

### Mocking External Services

```python
@pytest.fixture
def mock_redis(mocker):
    """Mock Redis connection."""
    return mocker.patch("django_redis.get_redis_connection")


def test_cache_hit(mock_redis, user):
    """Test permission cache hit."""
    mock_redis.return_value.get.return_value = b'["read", "write"]'
    
    permissions = get_cached_permissions(user.id)
    
    assert permissions == ["read", "write"]
```

---

## Parametrized Tests

For testing multiple cases:

```python
import pytest


@pytest.mark.parametrize("role,can_edit", [
    ("owner", True),
    ("admin", True),
    ("member", False),
    ("viewer", False),
])
def test_edit_permission_by_role(role, can_edit, organisation, user):
    """Test edit permission varies by role."""
    assign_role(user, role, organisation)
    
    result = check_permission(user, "organisations.update", organisation)
    
    assert result == can_edit


@pytest.mark.parametrize("status_code,error_message", [
    (400, "Invalid input"),
    (401, "Authentication required"),
    (403, "Permission denied"),
    (404, "Not found"),
])
def test_error_responses(status_code, error_message):
    """Test error response format."""
    response = make_error_response(status_code, error_message)
    
    assert response.status_code == status_code
    assert response.data["detail"] == error_message
```

---

## Coverage

### Running with Coverage

```bash
# Terminal report
pytest --cov=src

# With missing lines
pytest --cov=src --cov-report=term-missing

# HTML report
pytest --cov=src --cov-report=html
open htmlcov/index.html

# XML for CI
pytest --cov=src --cov-report=xml
```

### Coverage Configuration

In `pyproject.toml`:

```toml
[tool.coverage.run]
source = ["src"]
omit = [
    "*/migrations/*",
    "*/__init__.py",
    "*/tests/*",
]
branch = true

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
]
```

### Minimum Requirements

| Module | Minimum Coverage |
|--------|------------------|
| Models | 90% |
| Services | 85% |
| API Views | 80% |
| Utilities | 75% |

---

## Test Categories

### Unit Tests

Test individual functions/methods in isolation:

```python
def test_calculate_balance():
    """Test balance calculation logic."""
    transactions = [
        Transaction(amount=Decimal("100")),
        Transaction(amount=Decimal("-25")),
        Transaction(amount=Decimal("50")),
    ]
    
    balance = calculate_balance(transactions)
    
    assert balance == Decimal("125")
```

### Integration Tests

Test component interactions:

```python
@pytest.mark.django_db
def test_organisation_creation_flow(user):
    """Test full organisation creation flow."""
    # Create organisation
    org = create_organisation(name="Test Org", owner=user)
    
    # Verify owner is member
    assert org.members.filter(user=user).exists()
    
    # Verify audit event logged
    assert AuditEvent.objects.filter(
        event_type="organisation.created",
        organisation=org,
    ).exists()
```

### End-to-End Tests

Test complete user workflows:

```python
@pytest.mark.django_db
def test_complete_registration_flow(client):
    """Test user registration through to first login."""
    # Register
    response = client.post("/api/v1/auth/register/", {
        "email": "new@example.com",
        "password": "securepass123",
    })
    assert response.status_code == 201
    
    # Login
    response = client.post("/api/v1/auth/login/", {
        "email": "new@example.com",
        "password": "securepass123",
    })
    assert response.status_code == 200
    assert "access" in response.data
```

---

## CI Integration

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    pytest \
      --cov=src \
      --cov-report=xml \
      --cov-fail-under=80 \
      -v
```

### Test Markers

Use markers to control test execution:

```python
import pytest


@pytest.mark.slow
def test_large_data_processing():
    """Slow test for processing large datasets."""
    ...


@pytest.mark.integration
def test_external_api_call():
    """Integration test requiring external service."""
    ...
```

Run specific markers:

```bash
# Skip slow tests
pytest -m "not slow"

# Only integration tests
pytest -m integration
```

---

## Best Practices

### Do

- ✅ Write tests before or with code changes
- ✅ Use descriptive test names
- ✅ Test edge cases and error conditions
- ✅ Keep tests independent
- ✅ Use fixtures for common setup
- ✅ Mock external dependencies

### Don't

- ❌ Skip tests for "simple" code
- ❌ Write tests that depend on execution order
- ❌ Use hard-coded data in multiple tests
- ❌ Test implementation details
- ❌ Ignore flaky tests

---

## Debugging Tests

### Verbose Output

```bash
# Show print statements
pytest -s

# Show local variables on failure
pytest -l

# Extra verbose
pytest -vv
```

### Debug on Failure

```bash
# Drop into debugger on failure
pytest --pdb

# Drop into debugger on first failure
pytest --pdb -x
```

### In-Test Debugging

```python
def test_complex_logic():
    result = complex_function()
    
    # Add breakpoint
    breakpoint()  # Execution pauses here
    
    assert result == expected
```

---

## Next Steps

- Review [Code Style](code-style.md) for formatting
- Understand [PR Guidelines](pr-guidelines.md)
- Learn the [Spec Kitty Workflow](spec-kitty-workflow.md)
