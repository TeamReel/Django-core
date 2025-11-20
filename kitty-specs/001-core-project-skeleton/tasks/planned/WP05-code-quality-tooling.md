# Work Package WP05: Code Quality Tooling

**Status**: Planned  
**Priority**: P0 (Must Have)  
**Feature**: 001-core-project-skeleton  
**User Stories**: US-003 (Quality Gates)

---

## Goal

Configure Black, Ruff, mypy, and pre-commit hooks for automated code quality enforcement. This work package implements constitutional code quality requirements with automated tooling.

---

## Constitutional Alignment

- **Principle III (Code Quality)**: Black, Ruff, mypy mandatory for all code
- **Principle VIII (Developer Experience)**: Pre-commit hooks match CI, immediate feedback
- **Principle X (CI/CD)**: Quality gates preparation for CI pipeline

---

## Subtasks

### T026: Configure Black [PARALLEL]
**Description**: Add Black configuration to pyproject.toml

**Implementation Guidance**:
- Add [tool.black] section to pyproject.toml
- Set line-length = 100
- Set target-version = ["py312"]
- Set include = '\.pyi?$'
- Set extend-exclude for venv, migrations

**Definition of Done**:
- [ ] [tool.black] section exists in pyproject.toml
- [ ] line-length set to 100
- [ ] target-version set to py312
- [ ] exclude patterns configured

**Example**:
```toml
[tool.black]
line-length = 100
target-version = ["py312"]
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

---

### T027: Configure Ruff [PARALLEL]
**Description**: Add Ruff configuration to pyproject.toml

**Implementation Guidance**:
- Add [tool.ruff] section to pyproject.toml
- Set line-length = 100
- Set target-version = "py312"
- Add [tool.ruff.lint] section
- Enable rule sets: E (pycodestyle errors), W (pycodestyle warnings), F (pyflakes), I (isort), N (pep8-naming), S (bandit), B (bugbear)
- Add [tool.ruff.lint.per-file-ignores] for test files (allow S101 for assert)

**Definition of Done**:
- [ ] [tool.ruff] section exists in pyproject.toml
- [ ] line-length matches Black (100)
- [ ] target-version set to py312
- [ ] Rule sets enabled: E, W, F, I, N, S, B
- [ ] Test file ignores configured

**Example**:
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

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101"]  # Allow assert in tests
```

---

### T028: Configure mypy [PARALLEL]
**Description**: Add mypy configuration to pyproject.toml

**Implementation Guidance**:
- Add [tool.mypy] section to pyproject.toml
- Set python_version = "3.12"
- Enable strict mode: strict = true
- Set warn_return_any, warn_unused_configs
- Add [[tool.mypy.overrides]] for django-stubs
- Set plugins = ["mypy_django_plugin.main"]
- Add django_settings_module = "config.settings.local"

**Definition of Done**:
- [ ] [tool.mypy] section exists in pyproject.toml
- [ ] python_version set to 3.12
- [ ] strict mode enabled
- [ ] django-stubs plugin configured
- [ ] Django settings module specified

**Example**:
```toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_calls = true
warn_redundant_casts = true
warn_unused_ignores = true
plugins = ["mypy_django_plugin.main"]

[[tool.mypy.overrides]]
module = "config.settings.*"
django_settings_module = "config.settings.local"

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

---

### T029: Create .pre-commit-config.yaml [PARALLEL]
**Description**: Create pre-commit configuration with Black, Ruff, mypy hooks

**Implementation Guidance**:
- Create .pre-commit-config.yaml at project root
- Add repos for Black, Ruff, mypy
- Pin versions matching requirements/local.txt
- Configure hooks to run in order: Black → Ruff → mypy
- Add standard hooks: trailing-whitespace, end-of-file-fixer, check-yaml

**Definition of Done**:
- [ ] .pre-commit-config.yaml exists at project root
- [ ] Black hook configured with matching version
- [ ] Ruff hook configured with matching version
- [ ] mypy hook configured with django-stubs
- [ ] Standard hooks included (trailing-whitespace, etc.)
- [ ] Hooks run in correct order

**Example**:
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
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3.12

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.8
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
        additional_dependencies: [django-stubs==4.2.7, djangorestframework-stubs==3.14.5]
        args: [--config-file=pyproject.toml]
```

---

### T030: Create .editorconfig [PARALLEL]
**Description**: Create .editorconfig for consistent editor settings

**Implementation Guidance**:
- Create .editorconfig at project root
- Set root = true
- Configure [*]: indent_style, indent_size, end_of_line, charset, trim_trailing_whitespace, insert_final_newline
- Configure [*.py]: indent_size = 4
- Configure [*.{yml,yaml}]: indent_size = 2
- Configure [Makefile]: indent_style = tab

**Definition of Done**:
- [ ] .editorconfig exists at project root
- [ ] root = true set
- [ ] Python files use 4-space indentation
- [ ] YAML files use 2-space indentation
- [ ] Makefile uses tabs
- [ ] UTF-8 charset specified
- [ ] Trailing whitespace trimmed

**Example**:
```ini
# EditorConfig for Django Core-App skeleton
root = true

[*]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.py]
indent_size = 4
max_line_length = 100

[*.{yml,yaml}]
indent_size = 2

[*.{md,rst}]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

---

## Independent Test

**Test Name**: Verify all code quality tools run successfully

**Test Steps**:
1. Run Black:
   - Run: `black --check src/ tests/`
   - Expected: All files pass formatting check
   - If failures: Run `black src/ tests/` to format

2. Run Ruff:
   - Run: `ruff check src/ tests/`
   - Expected: No violations
   - If violations: Run `ruff check --fix src/ tests/`

3. Run mypy:
   - Run: `mypy src/config/`
   - Expected: No type errors
   - Note: Only check config/ initially (gradual typing)

4. Install pre-commit hooks:
   - Run: `pre-commit install`
   - Expected: Hooks installed successfully

5. Test pre-commit hooks:
   - Make a small change (e.g., add trailing whitespace to README)
   - Run: `git add README.md`
   - Run: `git commit -m "Test pre-commit"`
   - Expected: Hooks run, trailing whitespace removed, commit proceeds

6. Run all pre-commit hooks manually:
   - Run: `pre-commit run --all-files`
   - Expected: All hooks pass

**Expected Results**:
- Black: All files formatted correctly
- Ruff: No violations
- mypy: No type errors in config/
- pre-commit: Hooks installed and run successfully
- All tools complete in < 30 seconds

---

## Implementation Notes

### Tool Integration
- All tools configured in pyproject.toml (single source of truth)
- .pre-commit-config.yaml references tool versions from requirements
- Tools run in sequence: Black (format) → Ruff (lint) → mypy (type check)

### Gradual Typing Strategy
- Start with strict mypy on src/config/ only
- Expand to other modules as they're added
- Allow untyped definitions in tests (more lenient)

### Pre-commit Workflow
- Hooks run automatically on `git commit`
- Hooks match CI configuration (consistency)
- First run is slow (installs tools in isolated environments)
- Subsequent runs are fast (cached)

### Line Length Consistency
- Black: 100 characters
- Ruff: 100 characters
- .editorconfig: 100 characters (hint for editors)
- Consistent across all tools

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Type errors in Django code | Medium | Use django-stubs, start with config/ only |
| Pre-commit hooks too slow | Low | Accept first-run slowness, cache speeds up subsequent runs |
| Tool version conflicts | Low | Pin versions in requirements and pre-commit config |
| Black/Ruff formatting conflicts | Low | Ruff respects Black formatting (compatible) |

---

## Reviewer Guidance

### Code Review Checklist
- [ ] pyproject.toml has [tool.black], [tool.ruff], [tool.mypy] sections
- [ ] All tools configured with Python 3.12
- [ ] Line length consistent (100) across Black, Ruff
- [ ] .pre-commit-config.yaml versions match requirements/local.txt
- [ ] .editorconfig covers Python, YAML, Makefile
- [ ] Tool configurations follow constitutional requirements

### Testing Checklist
- [ ] `black --check src/ tests/` passes
- [ ] `ruff check src/ tests/` passes
- [ ] `mypy src/config/` passes
- [ ] `pre-commit install` succeeds
- [ ] `pre-commit run --all-files` passes
- [ ] Tools run in < 30 seconds total

### Manual Test Commands
```powershell
# Format code with Black
black src/ tests/

# Check formatting (CI mode)
black --check src/ tests/

# Lint with Ruff
ruff check src/ tests/

# Fix Ruff violations
ruff check --fix src/ tests/

# Type check with mypy
mypy src/config/

# Install pre-commit hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files

# Run specific hook
pre-commit run black --all-files
```

---

## Success Criteria Mapping

- **FR-018**: Black configured → pyproject.toml [tool.black]
- **FR-019**: Ruff configured → pyproject.toml [tool.ruff]
- **FR-020**: mypy configured → pyproject.toml [tool.mypy]
- **FR-021**: pre-commit hooks → .pre-commit-config.yaml
- **FR-022**: .editorconfig → .editorconfig file

---

## Dependencies

**Prerequisites**: WP01 (pyproject.toml must exist)

**Enables**:
- WP08 (Validation) will run all tools as validation steps
- CI/CD pipeline (future) will use same tool configurations

---

> This work package implements constitutional code quality requirements with zero-configuration enforcement. Tools are configured once and run automatically.
