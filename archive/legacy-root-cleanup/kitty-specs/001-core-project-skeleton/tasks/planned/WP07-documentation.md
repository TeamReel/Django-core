# Work Package WP07: Documentation

**Status**: Planned
**Priority**: P1 (Should Have)
**Feature**: 001-core-project-skeleton
**User Stories**: US-002 (Extend Skeleton)

---

## Goal

Create comprehensive documentation for the Django Core-App skeleton. This work package provides getting started guides, extension patterns, and architectural decision records.

---

## Constitutional Alignment

- **Principle XI (Documentation)**: In-repo docs, getting started guide, extension guide, ADRs required

---

## Subtasks

### T034: Create README.md [PARALLEL]
**Description**: Create project root README.md with overview, quick start, and links

**Implementation Guidance**:
- Create README.md at project root
- Include sections:
  - Project overview (what is this skeleton)
  - Features (what's included)
  - Quick start (< 10 minute setup)
  - Constitution reference (link to .kittify/memory/constitution.md)
  - Extension guide (link to docs/extension-guide.md)
  - Project structure (high-level overview)
  - Contributing (placeholder for future)
  - License (specify or TBD)

**Definition of Done**:
- [ ] README.md exists at project root
- [ ] All sections complete
- [ ] Quick start instructions < 10 minutes
- [ ] Links to detailed docs
- [ ] Constitution reference included

**Example Structure**:
```markdown
# Django Core-App Skeleton

Product-agnostic Django 5.x skeleton following Core-App Constitution.

## Features

- Django 5.1+ with Django REST Framework 3.14+
- Python 3.12+ with type hints
- pytest + pytest-django testing
- Black, Ruff, mypy code quality
- Environment-based settings
- Structured logging
- Health check endpoint
- Pre-commit hooks

## Quick Start

1. Clone and setup:
   ```bash
   git clone <repo-url>
   cd django-core
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   make install
   ```

2. Configure environment:
   ```bash
   Copy-Item .env.example .env
   # Edit .env with your SECRET_KEY
   ```

3. Run migrations and start server:
   ```bash
   make migrate
   make run
   ```

4. Verify health check:
   ```
   http://localhost:8000/health/
   ```

## Documentation

- [Setup Guide](docs/setup.md) - Detailed setup instructions
- [Extension Guide](docs/extension-guide.md) - How to add features
- [Constitution](../.kittify/memory/constitution.md) - Project governance

## Project Structure

See [src/README.md](src/README.md) for detailed structure.

## Contributing

See [Constitution](../.kittify/memory/constitution.md) for contribution guidelines.

## License

TBD
```

---

### T035: Create docs/README.md [PARALLEL]
**Description**: Create docs/README.md as documentation index

**Implementation Guidance**:
- Create docs/ directory if not exists
- Create docs/README.md
- Include sections:
  - Documentation overview
  - Available guides (setup, extension, ADRs)
  - Link to each document
  - How to contribute to docs

**Definition of Done**:
- [ ] docs/README.md exists
- [ ] Lists all available documentation
- [ ] Links to each guide
- [ ] Explains documentation structure

---

### T036: Create docs/setup.md [PARALLEL]
**Description**: Create detailed setup guide

**Implementation Guidance**:
- Create docs/setup.md
- Include sections:
  - Prerequisites (Python 3.12+, Git, etc.)
  - Virtual environment setup
  - Dependency installation
  - Environment configuration
  - Database setup
  - Running server
  - Running tests
  - Troubleshooting common issues

**Definition of Done**:
- [ ] docs/setup.md exists
- [ ] Prerequisites listed
- [ ] Step-by-step instructions
- [ ] Troubleshooting section
- [ ] Examples for Windows/PowerShell

---

### T037: Create docs/extension-guide.md [PARALLEL]
**Description**: Create guide for extending skeleton with new features

**Implementation Guidance**:
- Create docs/extension-guide.md
- Include sections:
  - How to add a Django app
  - How to add API endpoints
  - How to add tests
  - How to add database models
  - How to update documentation
  - Best practices
  - Examples

**Definition of Done**:
- [ ] docs/extension-guide.md exists
- [ ] Django app creation explained
- [ ] API endpoint pattern shown
- [ ] Testing guidance included
- [ ] Examples provided

**Example Content**:
```markdown
# Extension Guide

## Adding a Django App

1. Create app in core_apps/:
   ```bash
   python manage.py startapp myapp src/core_apps/myapp
   ```

2. Add to INSTALLED_APPS in settings/base.py:
   ```python
   INSTALLED_APPS = [
       # ...
       'core_apps.myapp',
   ]
   ```

3. Create models, views, serializers

4. Add tests in tests/test_myapp/

## Adding API Endpoints

1. Create serializer:
   ```python
   from rest_framework import serializers

   class MySerializer(serializers.ModelSerializer):
       class Meta:
           model = MyModel
           fields = '__all__'
   ```

2. Create viewset:
   ```python
   from rest_framework import viewsets

   class MyViewSet(viewsets.ModelViewSet):
       queryset = MyModel.objects.all()
       serializer_class = MySerializer
   ```

3. Register in urls.py:
   ```python
   from rest_framework.routers import DefaultRouter

   router = DefaultRouter()
   router.register('mymodel', MyViewSet)

   urlpatterns = [
       path('api/', include(router.urls)),
   ]
   ```

## Testing Guidelines

- Test file naming: `test_<feature>.py`
- Use pytest fixtures
- Use @pytest.mark.django_db for database access
- Keep tests fast and isolated
```

---

### T038: Create docs/adr/001-src-layout.md [PARALLEL]
**Description**: Create ADR documenting src/ layout decision

**Implementation Guidance**:
- Create docs/adr/ directory
- Create docs/adr/001-src-layout.md
- Follow ADR format: Status, Context, Decision, Consequences
- Document why src/ layout chosen over traditional Django layout

**Definition of Done**:
- [ ] docs/adr/001-src-layout.md exists
- [ ] Follows ADR format
- [ ] Explains src/ vs traditional layout
- [ ] Documents tradeoffs

**Example**:
```markdown
# ADR-001: Use src/ Layout for Django Project

**Status**: Accepted
**Date**: 2025-01-20
**Deciders**: Core team

## Context

Django projects traditionally place apps at the project root. Modern Python projects often use a src/ layout for better package isolation.

## Decision

Use src/ layout with:
- src/config/ for Django project settings
- src/core_apps/ for Django applications
- src/common/ for shared utilities
- tests/ at project root (not inside src/)

## Consequences

**Positive**:
- Clearer separation between source and project files
- Better Python packaging practices
- Prevents accidental imports from project root
- Consistent with Python community standards

**Negative**:
- Slightly different from Django tutorials
- Requires adjusting PYTHONPATH in some tools

**Mitigation**:
- Document clearly in README
- Provide examples in extension guide
```

---

### T039: Create src/core_apps/README.md [PARALLEL]
**Description**: Create README explaining how to add Django apps

**Implementation Guidance**:
- Create src/core_apps/README.md
- Explain purpose of core_apps/ directory
- Show how to create new app
- Reference extension guide for details

**Definition of Done**:
- [ ] src/core_apps/README.md exists
- [ ] Explains directory purpose
- [ ] Shows app creation command
- [ ] Links to extension guide

---

### T040: Create src/README.md [PARALLEL]
**Description**: Create README explaining source code structure

**Implementation Guidance**:
- Create src/README.md
- Document directory structure:
  - config/ - Django project settings
  - core_apps/ - Django applications
  - common/ - Shared utilities
- Explain purpose of each directory

**Definition of Done**:
- [ ] src/README.md exists
- [ ] All subdirectories documented
- [ ] Purpose of each explained
- [ ] Links to relevant guides

---

### T041: Create tests/README.md [PARALLEL]
**Description**: Create README explaining test organization

**Implementation Guidance**:
- Create tests/README.md
- Explain test structure
- Show how to run tests
- Reference testing best practices

**Definition of Done**:
- [ ] tests/README.md exists
- [ ] Test structure explained
- [ ] Running tests documented
- [ ] Pytest conventions explained

---

## Independent Test

**Test Name**: Verify documentation completeness and accuracy

**Test Steps**:
1. Follow README quick start:
   - Use fresh clone
   - Follow README steps exactly
   - Verify < 10 minute setup
   - Verify health check works

2. Check documentation links:
   - Open each document referenced in README
   - Verify all links work
   - Verify no broken references

3. Test extension guide:
   - Follow "Adding a Django App" section
   - Create test app following instructions
   - Verify app works

4. Review ADR:
   - Read ADR-001
   - Verify decision rationale clear
   - Check consequences documented

5. Check all READMEs:
   - Read src/README.md
   - Read tests/README.md
   - Read docs/README.md
   - Verify all accurate

**Expected Results**:
- Quick start completes in < 10 minutes
- All documentation links work
- Extension guide creates working app
- ADR format correct
- All READMEs accurate

---

## Implementation Notes

### Documentation Philosophy
- **In-repo**: All docs in repository (no external wikis)
- **Executable**: Instructions should be copy-paste ready
- **Examples**: Show, don't just tell
- **Updated**: Keep docs synchronized with code

### Quick Start Priority
- **Goal**: < 10 minute setup (SC-001)
- **Approach**: Minimal steps, clear commands
- **Testing**: Time actual execution
- **Feedback**: Update based on real user experience

### ADR Format
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: Why this decision needed
- **Decision**: What was decided
- **Consequences**: Positive, negative, mitigations

### README Hierarchy
- **Root README**: Overview and quick start
- **docs/README**: Documentation index
- **Subdirectory READMEs**: Directory-specific info
- **Guides**: Detailed how-to documents

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Documentation drift | High | Treat docs as code, review in PRs |
| Quick start > 10 minutes | Medium | Time actual setup, optimize steps |
| Unclear extension guide | Medium | Include working examples |
| Broken links | Low | Test links in documentation review |

---

## Reviewer Guidance

### Code Review Checklist
- [ ] README.md complete with all sections
- [ ] Quick start instructions clear and concise
- [ ] Extension guide includes working examples
- [ ] ADR follows format (Status, Context, Decision, Consequences)
- [ ] All subdirectory READMEs explain purpose
- [ ] Links between documents work
- [ ] Documentation references Constitution

### Testing Checklist
- [ ] Follow README quick start on fresh clone
- [ ] Verify setup completes in < 10 minutes
- [ ] Follow extension guide to create test app
- [ ] Check all documentation links
- [ ] Read all READMEs for accuracy

### Documentation Quality Checklist
- [ ] Grammar and spelling correct
- [ ] Code examples are accurate
- [ ] Commands work on target platform (Windows/PowerShell)
- [ ] Examples include expected output
- [ ] Troubleshooting section helpful

---

## Success Criteria Mapping

- **SC-001**: Setup time < 10 minutes → README quick start tested
- **FR-034**: README with quick start → Root README.md
- **FR-035**: Extension guide → docs/extension-guide.md
- **FR-036**: Setup guide → docs/setup.md
- **FR-037**: ADRs → docs/adr/001-src-layout.md
- **FR-038**: Subdirectory READMEs → src/README.md, tests/README.md, core_apps/README.md

---

## Dependencies

**Prerequisites**: WP01-WP06 (documents existing implementation)

**Enables**:
- Users can set up skeleton quickly
- Developers can extend skeleton confidently
- Architectural decisions are recorded

---

> This work package completes the skeleton with comprehensive documentation. Every decision is documented, every procedure is explained, every directory has context.
