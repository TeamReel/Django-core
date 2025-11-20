# Quick Start: Core Project Skeleton
*Path: [kitty-specs/001-core-project-skeleton/quickstart.md](kitty-specs/001-core-project-skeleton/quickstart.md)*

**Feature**: Core Project Skeleton  
**Audience**: Developers setting up the Django Core-App locally  
**Time**: < 10 minutes

---

## Prerequisites

- Python 3.12+ installed
- Git installed
- Command line access

**Check Python version**:
```bash
python --version  # Should show Python 3.12 or higher
```

---

## Quick Setup (< 10 Minutes)

### 1. Clone and Navigate

```bash
git clone https://github.com/TeamReel/Django-core.git
cd Django-core
```

### 2. Create Virtual Environment

```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS/Linux
python -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements/local.txt
```

**What gets installed**:
- Django 5.1+
- Django REST Framework
- pytest + pytest-django
- Black, Ruff, mypy
- django-environ
- Development tools

### 4. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and set SECRET_KEY
# (A random key is suggested in .env.example)
```

**Minimum .env content**:
```env
DJANGO_SETTINGS_MODULE=config.settings.local
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
```

### 5. Run Migrations

```bash
python manage.py migrate
```

**Expected output**: Django creates initial tables in SQLite database.

### 6. Start Development Server

```bash
python manage.py runserver
```

**Expected output**:
```
Performing system checks...
System check identified no issues (0 silenced).
Django version 5.1.x, using settings 'config.settings.local'
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

### 7. Verify Health Check

Open browser: http://127.0.0.1:8000/health/

**Expected response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-20T12:34:56.789Z"
}
```

### 8. Run Tests

```bash
pytest
```

**Expected output**:
```
======================== test session starts ========================
collected 3 items

tests/test_health.py::test_health_check PASSED
tests/test_settings.py::test_secret_key_not_default PASSED
tests/test_settings.py::test_debug_true_in_local PASSED

========================= 3 passed in 0.5s ==========================
```

### 9. Run Quality Checks

```bash
# Format code with Black
black src tests

# Lint with Ruff
ruff check src tests

# Type check with mypy
mypy src/config

# All checks together (use Makefile)
make check
```

**Expected**: All checks pass with no errors.

### 10. Install Pre-commit Hooks (Optional but Recommended)

```bash
pre-commit install
```

**What it does**: Runs Black, Ruff, mypy automatically before each commit.

---

## Verify Installation Checklist

- [ ] Python 3.12+ installed and active in virtual environment
- [ ] Dependencies installed without errors
- [ ] `.env` file created with SECRET_KEY set
- [ ] Migrations applied successfully
- [ ] Development server starts at http://127.0.0.1:8000/
- [ ] Health check endpoint returns JSON response
- [ ] Test suite runs and passes (3/3 tests)
- [ ] Black, Ruff, mypy run without errors
- [ ] Pre-commit hooks installed (optional)

---

## Common Commands

**Development Server**:
```bash
python manage.py runserver          # Start server
python manage.py runserver 8080     # Start on different port
```

**Database**:
```bash
python manage.py migrate            # Apply migrations
python manage.py makemigrations     # Create new migrations
python manage.py dbshell            # Open database shell
```

**Testing**:
```bash
pytest                              # Run all tests
pytest tests/test_health.py         # Run specific test file
pytest -v                           # Verbose output
pytest --cov                        # With coverage report
```

**Code Quality**:
```bash
black src tests                     # Format code
ruff check src tests                # Lint code
ruff check --fix src tests          # Lint and auto-fix
mypy src/config                     # Type check
```

**Django Management**:
```bash
python manage.py check              # System check
python manage.py check --deploy     # Production readiness check
python manage.py shell              # Django shell
python manage.py createsuperuser    # Create admin user (when auth added)
```

**Makefile Shortcuts**:
```bash
make install        # Install dependencies
make migrate        # Run migrations
make run            # Start dev server
make test           # Run tests
make check          # Run all quality checks
make format         # Format code with Black
make lint           # Lint with Ruff
make typecheck      # Type check with mypy
make clean          # Clean cache files
```

---

## Directory Overview

```
Django-core/
├── src/                    # Source code
│   ├── config/            # Django project settings, URLs, WSGI/ASGI
│   ├── core_apps/         # Future Django apps go here
│   └── common/            # Shared utilities (health, middleware)
├── tests/                 # All tests
├── docs/                  # Documentation
├── requirements/          # Dependency files
├── manage.py              # Django management script
├── pyproject.toml         # Tool configuration
├── .env                   # Local environment variables (not committed)
└── README.md              # Project overview
```

---

## Next Steps

**For Core Development**:
1. Review [Extension Guide](../../../docs/extension-guide.md) to understand how to add Django apps
2. Read [ADR-001](../../../docs/adr/001-src-layout.md) for architecture decisions
3. Check [Constitution](../../../.kittify/memory/constitution.md) for governance principles

**To Add a New Django App**:
1. Create app: `python manage.py startapp myapp src/core_apps/myapp`
2. Add to `INSTALLED_APPS` in `src/config/settings/base.py`
3. Create models, views, tests
4. Run `python manage.py makemigrations myapp`
5. Run `python manage.py migrate`

**For Production Setup**:
1. Set `DJANGO_SETTINGS_MODULE=config.settings.production`
2. Set `DEBUG=False` in environment
3. Configure PostgreSQL via `DATABASE_URL`
4. Set proper `ALLOWED_HOSTS`
5. Configure static/media file serving
6. Set up proper SECRET_KEY management (use secret manager)

---

## Troubleshooting

**Problem**: `ModuleNotFoundError: No module named 'config'`  
**Solution**: Make sure you're in the project root and virtual environment is active.

**Problem**: `django.core.exceptions.ImproperlyConfigured: Set the SECRET_KEY environment variable`  
**Solution**: Create `.env` file with `SECRET_KEY=your-secret-key-here`

**Problem**: Health check returns 404  
**Solution**: Make sure URL is http://127.0.0.1:8000/health/ (note trailing slash)

**Problem**: Tests fail with database errors  
**Solution**: Run `python manage.py migrate` to apply migrations first

**Problem**: mypy reports errors in Django code  
**Solution**: Ensure `django-stubs` is installed: `pip install django-stubs djangorestframework-stubs`

**Problem**: Pre-commit hooks are slow  
**Solution**: This is normal on first run. Subsequent runs are faster (only changed files).

---

## Getting Help

- **Documentation**: See `docs/` directory
- **Issues**: Check GitHub Issues
- **Constitution**: Review `.kittify/memory/constitution.md` for governance
- **Spec Kitty**: Use `/spec-kitty.*` commands for feature development

---

**Setup Complete!** You now have a working Django Core-App skeleton ready for development.
