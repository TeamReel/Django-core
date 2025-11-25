# django-core Development Guidelines
*Path: [templates/agent-file-template.md](templates/agent-file-template.md)*


Auto-generated from all feature plans. Last updated: 2025-11-23

## Active Technologies
- Python 3.12+ + Django 5.1+, gettext utilities (004-core-internationalization-base)
- Python 3.12+ + Django 5.1+, Django REST Framework 3.14+, django-stubs (type hints) (005-core-accounts-authentication)
- PostgreSQL (custom user model, sessions, Django groups/permissions) (005-core-accounts-authentication)
- Redis + django-redis (rate limiting, caching) (006-organisation-management-multi)
- django-prometheus + prometheus-client (metrics, observability) (006-organisation-management-multi)
- PostgreSQL (Project model with foreign keys to Organisation and User, unique constraints, indexes) (007-projects-workspaces-management)
- Python 3.12+ + Django 5.1+, Django REST Framework 3.14+, Redis + django-redis (caching), pytest 8.0+, mypy 1.8+ (008-hierarchical-access-control)
- PostgreSQL (Role, Permission, RoleAssignment models with unique constraints, composite indexes) (008-hierarchical-access-control)

## Project Structure
```
src/
tests/
```

## Commands
cd src; pytest; ruff check .

[IF SCRIPT_TYPE=powershell]
## PowerShell Syntax
**⚠️ IMPORTANT**: You are in a PowerShell environment. See [.kittify/templates/POWERSHELL_SYNTAX.md](.kittify/templates/POWERSHELL_SYNTAX.md) for correct syntax.

Quick reminders:
- Use `-Json` not `--json`
- Use `;` not `&&` for command chaining
- Use `.\.kittify\scripts\powershell\` not `./kittify/scripts/bash/`
[ENDIF]

## Code Style
Python 3.12+: Follow standard conventions

## Recent Changes
- 008-hierarchical-access-control: Added Python 3.12+ + Django 5.1+, Django REST Framework 3.14+, Redis + django-redis (caching), pytest 8.0+, mypy 1.8+
- 007-projects-workspaces-management: Added Python 3.12+ + Django 5.1+, Django REST Framework 3.14+, django-stubs (type hints)
- 006-organisation-management-multi: Added Redis + django-redis (rate limiting, caching), django-prometheus + prometheus-client (metrics, observability)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
