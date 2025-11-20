# Work Package WP06: Environment & Git Configuration

**Status**: Planned  
**Priority**: P0 (Must Have)  
**Feature**: 001-core-project-skeleton  
**User Stories**: US-004 (Environment Config)

---

## Goal

Set up environment variable management and Git configuration. This work package creates .env.example for documentation, .gitignore for security, and Makefile for developer convenience.

---

## Constitutional Alignment

- **Principle V (Security & Privacy)**: No secrets in code, environment variable management
- **Principle VIII (Developer Experience)**: Common tasks scripted, easy onboarding
- **Principle IX (Branching & Git)**: .gitignore protects secrets and build artifacts

---

## Subtasks

### T031: Create .env.example [PARALLEL]
**Description**: Create .env.example documenting all required environment variables

**Implementation Guidance**:
- Create .env.example at project root
- Include all required variables with example values
- Add comments explaining each variable
- Include variables for all environments (local, staging, production)
- Never include real secrets (use placeholder values)

**Definition of Done**:
- [ ] .env.example exists at project root
- [ ] All required variables documented
- [ ] Each variable has explanatory comment
- [ ] Example values are safe (not real secrets)
- [ ] Variables organized by category

**Example**:
```bash
# Django Core Settings
# Generate SECRET_KEY with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-secret-key-here-change-this-in-production

# Debug mode (True for development, False for production)
DEBUG=True

# Environment selection (local, staging, production)
DJANGO_SETTINGS_MODULE=config.settings.local

# Allowed hosts (comma-separated list)
# Development: localhost,127.0.0.1
# Production: yourdomain.com,www.yourdomain.com
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
# Development: sqlite:///db.sqlite3
# Production: postgres://user:password@localhost:5432/dbname
DATABASE_URL=sqlite:///db.sqlite3

# Security Settings (production only)
CSRF_COOKIE_SECURE=False
SESSION_COOKIE_SECURE=False
SECURE_SSL_REDIRECT=False
```

---

### T032: Update .gitignore [PARALLEL]
**Description**: Create/update .gitignore to exclude secrets, build artifacts, and tool outputs

**Implementation Guidance**:
- Create .gitignore at project root (or update if exists)
- Include Python standard ignores (__pycache__, *.pyc, *.pyo)
- Include Django-specific ignores (db.sqlite3, media/, staticfiles/)
- Include environment files (.env)
- Include tool outputs (.coverage, htmlcov/, .mypy_cache/, .pytest_cache/, .ruff_cache/)
- Include IDE files (.vscode/, .idea/, *.swp)
- Include OS files (.DS_Store, Thumbs.db)

**Definition of Done**:
- [ ] .gitignore exists at project root
- [ ] .env excluded (protect secrets)
- [ ] db.sqlite3 excluded (local database)
- [ ] Tool outputs excluded (coverage, cache)
- [ ] IDE and OS files excluded
- [ ] Comments explain each section

**Example**:
```gitignore
# Environment variables (contains secrets)
.env

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
.venv/
ENV/
env/

# Django
db.sqlite3
db.sqlite3-journal
/media/
/staticfiles/
/static/

# Testing
.coverage
htmlcov/
.pytest_cache/
.tox/

# Type checking
.mypy_cache/
.dmypy.json
dmypy.json

# Linting
.ruff_cache/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
```

---

### T033: Create Makefile [PARALLEL]
**Description**: Create Makefile with common development tasks

**Implementation Guidance**:
- Create Makefile at project root
- Add targets: install, migrate, run, test, check, format, lint, typecheck, clean
- Use .PHONY declarations for targets
- Include help target explaining each command
- Use variables for Python and pip commands
- Add comments explaining each target

**Definition of Done**:
- [ ] Makefile exists at project root
- [ ] All targets implemented: install, migrate, run, test, check, format, lint, typecheck, clean
- [ ] .PHONY declarations for all targets
- [ ] help target lists all commands
- [ ] Works with PowerShell (use simple commands)

**Example**:
```makefile
.PHONY: help install migrate run test check format lint typecheck clean

# Default target
help:
	@echo "Django Core-App Development Commands"
	@echo "====================================="
	@echo "make install    - Install dependencies"
	@echo "make migrate    - Run database migrations"
	@echo "make run        - Start development server"
	@echo "make test       - Run tests with coverage"
	@echo "make check      - Run all quality checks"
	@echo "make format     - Format code with Black"
	@echo "make lint       - Lint code with Ruff"
	@echo "make typecheck  - Type check with mypy"
	@echo "make clean      - Remove build artifacts"

install:
	pip install -r requirements/local.txt
	pre-commit install

migrate:
	python manage.py migrate

run:
	python manage.py runserver

test:
	pytest --cov=src --cov-report=html --cov-report=term

check: format lint typecheck test
	python manage.py check --deploy

format:
	black src/ tests/

lint:
	ruff check src/ tests/

typecheck:
	mypy src/config/

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .coverage htmlcov/ .pytest_cache/ .mypy_cache/ .ruff_cache/
	rm -rf build/ dist/ *.egg-info/
```

---

## Independent Test

**Test Name**: Verify environment and git configuration works

**Test Steps**:
1. Test .env.example:
   - Copy: `Copy-Item .env.example .env`
   - Edit .env with real values
   - Verify Django loads settings: `python manage.py check`
   - Delete test .env file

2. Test .gitignore:
   - Create test .env file: `New-Item -ItemType File -Path ".env"`
   - Run: `git status`
   - Expected: .env not shown in untracked files
   - Delete test .env file

3. Test Makefile targets:
   - Run: `make help`
   - Expected: Help text displayed
   - Run: `make install`
   - Expected: Dependencies installed, pre-commit hooks installed
   - Run: `make test`
   - Expected: Tests run with coverage
   - Run: `make format`
   - Expected: Black formats code
   - Run: `make clean`
   - Expected: Build artifacts removed

4. Test environment variable loading:
   - Set: `$env:SECRET_KEY = "test-key"`
   - Set: `$env:DATABASE_URL = "sqlite:///test.db"`
   - Run: `python manage.py check`
   - Expected: No errors, settings loaded from environment

**Expected Results**:
- .env.example provides clear documentation
- .gitignore excludes sensitive and generated files
- Makefile commands work correctly
- Environment variables load successfully

---

## Implementation Notes

### .env.example Best Practices
- Include all required variables (document everything)
- Use safe placeholder values (never real secrets)
- Add comments explaining purpose and format
- Include examples for different environments
- Update when new variables added

### .gitignore Strategy
- Protect secrets (.env)
- Exclude local databases (db.sqlite3)
- Exclude tool outputs (coverage, caches)
- Exclude IDE/OS files
- Never commit generated files

### Makefile Conventions
- .PHONY prevents conflicts with files named same as targets
- help target is default (no arguments runs help)
- Targets use simple commands (compatible with make on all platforms)
- check target runs all quality gates (CI simulation)

### PowerShell Compatibility
- Makefile commands should be simple (pip, python, pytest)
- Avoid complex shell syntax (|| operators, etc.)
- Use semicolons for command chaining if needed
- Test on Windows PowerShell 5.1

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Developers forget to create .env | High | README emphasizes .env.example → .env step |
| .env accidentally committed | Critical | .gitignore excludes .env, add pre-commit hook to check |
| Makefile not portable | Low | Use simple commands, test on target platform |
| Missing environment variables | Medium | Fail fast with clear error messages |

---

## Reviewer Guidance

### Code Review Checklist
- [ ] .env.example includes all required variables
- [ ] .env.example has clear comments
- [ ] .env.example uses safe placeholder values
- [ ] .gitignore excludes .env file
- [ ] .gitignore excludes all sensitive/generated files
- [ ] Makefile includes all required targets
- [ ] Makefile has .PHONY declarations
- [ ] Makefile help target explains commands

### Testing Checklist
- [ ] Copy .env.example to .env and verify Django loads
- [ ] Create .env file and verify git status doesn't show it
- [ ] `make help` displays help text
- [ ] `make install` installs dependencies
- [ ] `make test` runs tests successfully
- [ ] `make check` runs all quality gates
- [ ] `make clean` removes build artifacts

### Security Checklist
- [ ] .env excluded in .gitignore
- [ ] No secrets in .env.example
- [ ] SECRET_KEY generation command documented
- [ ] Production variables clearly marked

### Manual Test Commands
```powershell
# Test .env.example
Copy-Item .env.example .env
# Edit .env with real values
python manage.py check

# Test .gitignore
New-Item -ItemType File -Path ".env"
git status  # Should not show .env

# Test Makefile
make help
make install
make test
make check
make clean

# Test environment loading
$env:SECRET_KEY = "test-key"
$env:DATABASE_URL = "sqlite:///test.db"
python manage.py check
```

---

## Success Criteria Mapping

- **SC-001**: Setup time < 10 minutes → Makefile install target streamlines setup
- **SC-003**: No secrets in code → .env.example + .gitignore enforce this
- **SC-005**: Environment-based config → .env.example documents all variables
- **FR-031**: Environment management → .env.example created
- **FR-032**: .gitignore comprehensive → All sensitive files excluded
- **FR-033**: Makefile convenience → Common tasks scripted

---

## Dependencies

**Prerequisites**: WP01 (project structure must exist)

**Enables**:
- All work packages benefit from Makefile convenience
- .gitignore protects all subsequent work from secret leaks

---

> This work package establishes secure environment management and developer convenience. No secrets ever committed, all tasks easily executable.
