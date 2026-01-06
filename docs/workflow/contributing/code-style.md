# Code Style

This guide documents the Python coding conventions and tooling used in Django Core-App.

## Python Version

**Required: Python 3.12+**

We use Python 3.12 for:
- Modern type hint syntax (PEP 695)
- Performance improvements
- Latest language features

---

## Formatting

### Black

We use [Black](https://black.readthedocs.io/) for consistent code formatting.

**Configuration** (in `pyproject.toml`):
```toml
[tool.black]
line-length = 100
target-version = ['py312']
include = '\.pyi?$'
extend-exclude = '''
/(
    \.git
    | \.venv
    | venv
    | \.mypy_cache
    | \.pytest_cache
    | migrations
)/
'''
```

**Usage:**
```bash
# Format all code
black src/

# Check without modifying
black --check src/

# Show diff
black --diff src/
```

---

## Linting

### Ruff

We use [Ruff](https://docs.astral.sh/ruff/) for fast linting and import sorting.

**Configuration** (in `pyproject.toml`):
```toml
[tool.ruff]
line-length = 100
target-version = "py312"
exclude = [
    ".git",
    ".venv",
    "venv",
    "migrations",
    "__pycache__",
]

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "N",   # pep8-naming
    "S",   # bandit (security)
    "B",   # bugbear
]
```

**Usage:**
```bash
# Check for issues
ruff check src/

# Auto-fix issues
ruff check --fix src/

# Show all issues with explanations
ruff check src/ --show-fixes
```

---

## Type Hints

Type hints are **required** for all functions and methods.

### Basic Syntax

```python
def greet(name: str) -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"


def process_items(items: list[str], limit: int | None = None) -> dict[str, int]:
    """Process items and return counts."""
    result: dict[str, int] = {}
    for item in items[:limit]:
        result[item] = result.get(item, 0) + 1
    return result
```

### Modern Type Syntax (Python 3.12+)

```python
# Use built-in generics (not typing.List, typing.Dict)
def get_users() -> list[User]:
    ...

# Use | for union types (not typing.Union)
def find_user(user_id: int) -> User | None:
    ...

# Type aliases with type statement (PEP 695)
type UserID = int
type UserMap = dict[UserID, User]
```

### Django-Specific Types

```python
from django.db.models import QuerySet
from django.http import HttpRequest, HttpResponse

from accounts.models import User


def get_active_users() -> QuerySet[User]:
    """Return queryset of active users."""
    return User.objects.filter(is_active=True)


def user_profile(request: HttpRequest, user_id: int) -> HttpResponse:
    """Display user profile page."""
    ...
```

### Type Checking with mypy

**Configuration** (in `pyproject.toml`):
```toml
[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["mypy_django_plugin.main"]

[[tool.mypy.overrides]]
module = "*.migrations.*"
ignore_errors = true
```

**Usage:**
```bash
# Check all code
mypy src/

# Check specific module
mypy src/accounts/

# Show error codes
mypy src/ --show-error-codes
```

---

## Import Organization

Imports are organized in the following order:

1. **Standard library** imports
2. **Third-party** imports
3. **Django** imports
4. **Local application** imports

Each group is separated by a blank line.

```python
# Standard library
import json
from datetime import datetime
from pathlib import Path

# Third-party
import requests
from redis import Redis

# Django
from django.conf import settings
from django.db import models
from django.http import HttpRequest

# Local application
from accounts.models import User
from permissions.services import check_permission
```

Ruff handles import sorting automatically with `ruff check --fix`.

---

## Naming Conventions

### Modules and Packages

```python
# Good: lowercase with underscores
my_module.py
user_services.py
authentication_backends.py

# Bad
MyModule.py
userServices.py
```

### Classes

```python
# Good: PascalCase
class UserProfile:
    pass

class OrganisationMember:
    pass

class HTTPRequestHandler:  # Acronyms stay uppercase
    pass
```

### Functions and Methods

```python
# Good: snake_case
def get_user_by_email(email: str) -> User | None:
    pass

def calculate_total_credits() -> Decimal:
    pass
```

### Variables

```python
# Good: snake_case
user_count = 0
active_users: list[User] = []
is_authenticated = True

# Bad
userCount = 0
ActiveUsers = []
```

### Constants

```python
# Good: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_SECONDS = 30
API_VERSION = "v1"
```

### Private Members

```python
class UserService:
    def __init__(self):
        self._cache = {}          # Single underscore: internal use
        self.__secret_key = ""    # Double underscore: name mangling (avoid)

    def _validate_input(self, data: dict) -> bool:
        """Internal validation method."""
        ...
```

---

## Django Conventions

### Models

```python
from django.db import models


class Organisation(models.Model):
    """Organisation model with audit fields."""

    # Primary key (explicit for clarity)
    id = models.BigAutoField(primary_key=True)

    # Required fields first
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)

    # Optional fields
    description = models.TextField(blank=True)

    # Foreign keys
    owner = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="owned_organisations",
    )

    # Audit fields last
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "organisation"
        verbose_name_plural = "organisations"

    def __str__(self) -> str:
        return self.name
```

### Views

```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class OrganisationViewSet(viewsets.ModelViewSet):
    """API endpoint for organisations."""

    queryset = Organisation.objects.all()
    serializer_class = OrganisationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter queryset to user's organisations."""
        return super().get_queryset().filter(
            members__user=self.request.user
        )

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Archive an organisation."""
        organisation = self.get_object()
        organisation.archive()
        return Response({"status": "archived"})
```

### Serializers

```python
from rest_framework import serializers


class OrganisationSerializer(serializers.ModelSerializer):
    """Serializer for Organisation model."""

    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "owner_email",
            "member_count",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "created_at"]

    def get_member_count(self, obj: Organisation) -> int:
        """Return number of organisation members."""
        return obj.members.count()
```

---

## Docstrings

We use Google-style docstrings.

### Functions

```python
def create_organisation(
    name: str,
    owner: User,
    *,
    description: str = "",
) -> Organisation:
    """Create a new organisation.

    Creates an organisation with the given name and owner. The owner
    is automatically added as the first member with the Owner role.

    Args:
        name: The organisation name. Must be unique.
        owner: The user who will own the organisation.
        description: Optional description text.

    Returns:
        The newly created Organisation instance.

    Raises:
        ValidationError: If the name is already taken.
        PermissionError: If the owner cannot create organisations.

    Example:
        >>> org = create_organisation("Acme Corp", user)
        >>> org.name
        'Acme Corp'
    """
    ...
```

### Classes

```python
class PermissionChecker:
    """Check user permissions against resources.

    The PermissionChecker evaluates whether a user has specific
    permissions on a resource (organisation or project). It uses
    Redis caching to improve performance.

    Attributes:
        cache_ttl: Time-to-live for cached permissions in seconds.
        cache: The Redis cache instance.

    Example:
        >>> checker = PermissionChecker()
        >>> checker.has_permission(user, "projects.update", project)
        True
    """

    cache_ttl: int = 300

    def __init__(self, cache: Redis | None = None) -> None:
        """Initialize the permission checker.

        Args:
            cache: Optional Redis instance. Uses default if not provided.
        """
        ...
```

---

## Pre-commit Hooks

We use pre-commit hooks to ensure code quality before commits.

### Setup

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run on all files (first time)
pre-commit run --all-files
```

### Configuration

`.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 24.4.2
    hooks:
      - id: black

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        additional_dependencies:
          - django-stubs
```

---

## Quick Reference

| Tool | Command | Purpose |
|------|---------|---------|
| Black | `black src/` | Format code |
| Ruff | `ruff check src/` | Lint code |
| mypy | `mypy src/` | Type check |
| Pre-commit | `pre-commit run --all-files` | All checks |

---

## Next Steps

- Set up your environment with the [Quickstart](../getting-started/quickstart.md)
- Understand [Testing](testing.md) requirements
- Review [PR Guidelines](pr-guidelines.md) for submissions
