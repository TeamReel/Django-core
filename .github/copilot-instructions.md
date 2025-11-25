# django-core Development Guidelines
*Path: [templates/agent-file-template.md](templates/agent-file-template.md)*


Auto-generated from all feature plans. Last updated: 2025-11-23

## Active Technologies
- Python 3.12+ + Django 5.1+, gettext utilities (004-core-internationalization-base)
- Python 3.12+ + Django 5.1+, Django REST Framework 3.14+, django-stubs (type hints) (005-core-accounts-authentication)
- PostgreSQL (custom user model, sessions, Django groups/permissions) (005-core-accounts-authentication)
- Redis + django-redis (rate limiting, caching) (006-organisation-management-multi)
- django-prometheus + prometheus-client (metrics, observability) (006-organisation-management-multi)

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
- 006-organisation-management-multi: Added Redis + django-redis (rate limiting, caching), django-prometheus + prometheus-client (metrics, observability)
- 005-core-accounts-authentication: Added Python 3.12+ + Django 5.1+, Django REST Framework 3.14+, django-stubs (type hints)
- 004-core-internationalization-base: Added Python 3.12+ + Django 5.1+, gettext utilities

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
