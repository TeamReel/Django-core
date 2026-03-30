# B04: Core Internationalization Base

**Phase:** 1
**Status:** ✅ Done
**Module ID:** 004
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 4. B04 – Core Internationalization Base

**Doel**: Server-side i18n/l10n primitives: locales, translations, formatting, timezones.

**Status**: ✅ Complete

**Key Features**:
- Django i18n/l10n framework
- gettext utilities integration
- Locale management
- Timezone handling
- Translation workflow

---

**Fase 1 Compleet**: 4 modules (B01-B04)
**Outcome**: Secured, i18n-ready skeleton with governance and enforcement in place
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Implementation Plan: Core Internationalization Base Layer

**Branch**: `004-core-internationalization-base` | **Date**: 2025-11-23 | **Spec**: [spec.md
**Input**: Feature specification from `/kitty-specs/004-core-internationalization-base/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Establish foundational internationalization (i18n) and localization (l10n) infrastructure for the Django core, enabling multi-language support for server-side components. Configure English (US) as default language and UTC as default timezone, using Django's built-in i18n/l10n framework. Provide clear translation patterns for developers and establish a hybrid translation file organization structure (centralized core messages, per-app organization). Include structured logging for translation events with observability hooks. Target 80% test coverage.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, gettext utilities
**Storage**: N/A (configuration-based feature, no database tables)
**Testing**: pytest + pytest-django (target: 80% line coverage)
**Target Platform**: Linux/Windows server environments
**Project Type**: Configuration and infrastructure (settings, middleware, documentation)
**Performance Goals**: Translation lookups leverage Django's cached loader (negligible overhead)
**Constraints**:
- Must maintain compatibility with future B12 (user/org preferences) feature
- No frontend i18n frameworks (server-side only)
- No breaking changes to existing Django apps
**Scale/Scope**:
- Affects all Django apps in core
- Initial support: English (US) only
- Extensible to additional languages without code changes
- Translation file organization: Hybrid (centralized `src/locale/` + per-app `src/<app>/locale/`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  Verify implementation plan complies with Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md

  Mark each check as:
  ✅ PASS - Compliant
  ⚠️ NEEDS REVIEW - Potential issue requiring justification
  ❌ VIOLATION - Non-compliant (must be resolved or justified)
-->

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [x] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability)
- [x] **Downstream Extension**: Product-specific needs are handled via documented extension points

### II. Architecture and Modularity
- [x] **Single Responsibility**: Each Django app has one clear purpose
- [x] **Stable APIs**: Public interfaces are documented and stable
- [x] **Minimal Dependencies**: Only necessary dependencies included
- [x] **No Circular Deps**: Dependency graph is acyclic
- [x] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: Core modules will use type hints throughout
- [x] **Black Formatting**: All code will be formatted with Black
- [x] **Ruff Linting**: Ruff will be primary linter
- [x] **No Dead Code**: Implementation removes unused code
- [x] **Readable Code**: Functions/classes remain small and focused
- [x] **Curated Dependencies**: New dependencies are justified and pinned

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
- [x] **Test Coverage**: Tests included for all features (80% target)
- [x] **Regression Tests**: Bug fixes include tests preventing recurrence
- [x] **Deterministic**: Tests are not flaky or environment-dependent
- [x] **Coverage Thresholds**: Coverage targets defined and enforced (80%)
- [x] **Integration Tests**: Key user flows have integration test coverage

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured
- [x] **DEBUG Off**: DEBUG disabled in non-dev environments
- [x] **No Secrets**: No secrets committed; env vars/secret managers used
- [x] **Dependency Scanning**: CI will scan dependencies for vulnerabilities
- [x] **Centralized Auth**: Authentication/authorization uses core mechanisms
- [x] **No Sensitive Logging**: Sensitive data not logged

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Query optimization plan documented (N/A - no queries)
- [x] **Pagination**: APIs use pagination for unbounded data (N/A - no APIs)
- [x] **Explicit Caching**: Caching strategy documented if used (Django cached loader)
- [x] **Structured Logging**: Logging infrastructure in place (translation_key, language_code, fallback_reason)
- [x] **Health Checks**: Health check endpoints defined (N/A - configuration only)
- [x] **Metrics Hooks**: Observability metrics captured (via structured logging)
- [x] **Graceful Degradation**: Failure handling strategy defined (fallback to English US)

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs (N/A - no new APIs)
- [x] **Consistent Responses**: API response format standardized (N/A - affects existing APIs transparently)
- [x] **Versioning Strategy**: Breaking changes handled via versioning or deprecation (no breaking changes)
- [x] **Clear Errors**: Error messages clear and safe (no data leaks)
- [x] **Boundary Validation**: Validation in serializers/forms (Django validates locale/timezone)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple (settings auto-applied)
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured (existing)
- [x] **Pre-commit Hooks**: Hooks match CI checks (existing)
- [x] **Type Checking**: mypy runs cleanly on core modules
- [x] **Task Scripts**: Common operations scripted (gettext utilities)
- [x] **Developer Docs**: Setup and development docs exist (quickstart.md)

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `004-core-internationalization-base` branch
- [x] **Linked to Spec**: PR will reference spec document
- [x] **Focused PRs**: Changes remain small and focused
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI (existing)
- [x] **Merge Gates**: All CI checks must pass before merge (existing)
- [x] **Scripted Deployment**: Deployment process documented/automated (existing)

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository
- [x] **App README**: Each Django app has README (N/A - no new apps)
- [x] **Getting Started**: Setup guide exists or will be updated
- [x] **Extension Guide**: "How to extend" documentation exists or planned (quickstart.md)
- [x] **Spec Sync**: Implementation keeps spec up to date
- [x] **ADR Required**: Major architectural decisions documented (N/A - standard Django usage)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required (or changes documented)

### Violations Requiring Justification

*No violations - this feature uses Django's built-in i18n/l10n framework with standard configuration patterns.*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/[###-feature]/
├── plan.md              # This file (/spec-kitty.plan command output)
├── research.md          # Phase 0 output (/spec-kitty.plan command)
├── data-model.md        # Phase 1 output (/spec-kitty.plan command)
├── quickstart.md        # Phase 1 output (/spec-kitty.plan command)
├── contracts/           # Phase 1 output (/spec-kitty.plan command)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
src/
├── config/
│   └── settings/
│       ├── base.py           # Add i18n/l10n configuration
│       ├── local.py          # Development settings
│       ├── production.py     # Production settings
│       └── staging.py        # Staging settings
├── locale/                   # NEW: Centralized translation files for core messages
│   └── [language_code]/
│       └── LC_MESSAGES/
│           ├── django.po     # Translation source
│           └── django.mo     # Compiled translations
└── [existing apps]/
    └── locale/               # NEW: Per-app translation files (optional)
        └── [language_code]/
            └── LC_MESSAGES/

tests/
├── fixtures/
│   └── translations/         # NEW: Test translation fixtures
└── config/
    └── test_i18n_settings.py # NEW: Test i18n configuration

**Structure Decision**: Django web application using standard Django settings structure. No new Django apps required—this is pure configuration. Translation files use Django's standard locale/ directory pattern with hybrid organization (centralized src/locale/ for core messages, per-app src/<app>/locale/ for app-specific messages).

## Complexity Tracking

*No additional complexity introduced beyond standard Django i18n/l10n framework usage.*

---

## Phase 0: Research

**Objective**: Document Django i18n/l10n framework decisions, translation workflow patterns, and hybrid organization approach.

**Deliverable**: `research.md`

### Tasks

1. **Framework Decision**: Document Django built-in i18n/l10n framework selection
   - Rationale: Battle-tested, well-documented, no additional dependencies
   - Alternatives considered: gettext alone (lacks Django integration), custom solution (unnecessary complexity)
   - Reference: [Django i18n documentation](https://docs.djangoproject.com/en/5.1/topics/i18n/)

2. **Translation Organization Pattern**: Document hybrid approach
   - Core messages: `src/locale/` (centralized for cross-cutting concerns)
   - App-specific: `src/<app>/locale/` (isolated per-app translations)
   - Rationale: Balance between centralization and modularity

3. **Workflow Patterns**: Document translation marking best practices
   - Python code: `gettext()`, `gettext_lazy()` for lazy evaluation
   - Templates: `{% trans %}` for simple strings, `{% blocktrans %}` for complex
   - JavaScript: Future consideration (out of scope for base layer)

4. **Fallback Strategy**: Document language fallback chain
   - Primary: Requested language (e.g., `fr-CA`)
   - Fallback 1: Language family (e.g., `fr`)
   - Fallback 2: English (US) default
   - Logging: Structured logs with `translation_key`, `language_code`, `fallback_reason`

5. **Testing Strategy**: Document i18n testing patterns
   - Test translation loading (fixtures with test .po files)
   - Test fallback behavior (missing translations)
   - Test locale middleware (language selection)
   - Coverage target: 80% line coverage

**Exit Criteria**: `research.md` created with framework decisions, alternatives considered, and workflow patterns documented.

---

## Phase 1: Design & Contracts

**Objective**: Create minimal data model, quickstart guide for translation workflow, and agent context update.

**Deliverables**:
- `data-model.md`
- `quickstart.md`
- Updated `.kittify/memory/agent/copilot/context.md`

### Tasks

1. **Data Model** (`data-model.md`)
   - **Note**: This is a configuration-based feature with no database models
   - Document conceptual entities:
     - **Translation Catalog**: Message IDs, translations, metadata (stored in .po/.mo files)
     - **Locale Configuration**: Language code, timezone, format settings (Django settings)
     - **Language Fallback Chain**: Ordered list with English (US) default
   - Document Django settings impact:
     - `LANGUAGE_CODE`, `TIME_ZONE`, `USE_I18N`, `USE_L10N`, `USE_TZ`
     - `LANGUAGES`, `LOCALE_PATHS`
     - `MIDDLEWARE` (LocaleMiddleware position)

2. **Translation Workflow Guide** (`quickstart.md`)
   - **Section 1: Marking Strings as Translatable**
     - Python: `from django.utils.translation import gettext, gettext_lazy`
     - Templates: `{% load i18n %}` then `{% trans "text" %}`
     - Examples for both simple and complex translations

   - **Section 2: Generating Translation Files**
     - Command: `django-admin makemessages -l [language_code]`
     - Output: `.po` files in `locale/` directories
     - Edit workflow: Use Poedit or text editor

   - **Section 3: Compiling Translations**
     - Command: `django-admin compilemessages`
     - Output: `.mo` files (binary, used by Django)
     - When to run: After editing .po files, before deployment

   - **Section 4: Adding a New Language**
     - Update `settings.LANGUAGES` tuple
     - Run `makemessages -l [new_language]`
     - Translate strings in `.po` file
     - Compile with `compilemessages`

   - **Section 5: Testing Translations**
     - Set test language: `override_settings(LANGUAGE_CODE='fr')`
     - Use `translation.activate('fr')` in tests
     - Test fixture setup with sample translations

3. **API Contracts** (`contracts/`)
   - **N/A**: This feature has no HTTP API contracts (configuration only)
   - Translation affects response content transparently

4. **Agent Context Update**
   - Run: `.kittify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
   - Add i18n/l10n technology context:
     - Django translation framework usage patterns
     - Translation file organization (hybrid approach)
     - gettext utilities (makemessages, compilemessages)
     - Testing patterns for translations

**Exit Criteria**:
- `data-model.md` documents conceptual entities and settings
- `quickstart.md` provides complete translation workflow guide
- Agent context updated with i18n/l10n patterns

---

## Phase 2: Task Generation

**Note**: Phase 2 is handled by the `/spec-kitty.tasks` command, which generates `tasks.md` from this plan.

**DO NOT create `tasks.md` during planning—it will be auto-generated.**

The tasks phase will break down implementation into:
- **WP01**: Settings configuration (base.py, local.py, production.py, staging.py)
- **WP02**: Locale directory setup (src/locale/ structure)
- **WP03**: Middleware configuration (LocaleMiddleware, timezone)
- **WP04**: Structured logging for translation events
- **WP05**: Test fixtures and test suite (80% coverage)
- **WP06**: Documentation (README updates, developer guides)
- **WP07**: Validation and success criteria verification

---

## Agent Context for Implementation

Once planning is complete, the implementing agent should know:

1. **Technology Stack**:
   - Django 5.1+ built-in i18n/l10n framework
   - Python gettext utilities (makemessages, compilemessages)
   - No additional dependencies required

2. **Translation Organization**:
   - **Hybrid approach**: Centralized `src/locale/` + per-app `src/<app>/locale/`
   - Core messages: `src/locale/en_US/LC_MESSAGES/django.po`
   - App-specific: `src/<app>/locale/en_US/LC_MESSAGES/django.po`

3. **Configuration Changes** (all in `src/config/settings/`):
   - `LANGUAGE_CODE = 'en-us'`
   - `TIME_ZONE = 'UTC'`
   - `USE_I18N = True`
   - `USE_L10N = True` (deprecated but included for clarity)
   - `USE_TZ = True`
   - `LANGUAGES = [('en', 'English')]` (extensible)
   - `LOCALE_PATHS = [BASE_DIR / 'locale']`
   - `MIDDLEWARE`: Include `django.middleware.locale.LocaleMiddleware`

4. **Testing Requirements**:
   - 80% line coverage target
   - Test translation loading (fixtures with .po files)
   - Test fallback behavior (missing translations)
   - Test locale middleware (language activation)
   - Integration tests for translation workflow

5. **Structured Logging Fields**:
   - `translation_key`: Message ID being translated
   - `language_code`: Target language
   - `fallback_reason`: Why fallback occurred (e.g., "missing_translation")

6. **Success Criteria** (from spec):
   - English (US) configured as default language ✓
   - UTC configured as default timezone ✓
   - Translation file directories established ✓
   - Developer documentation complete (quickstart.md) ✓
   - 80% test coverage achieved ✓
   - Structured logging implemented ✓
   - Zero breaking changes to existing functionality ✓

---

## Handoff Checklist

Before proceeding to `/spec-kitty.tasks`:

- [x] Constitution Check: ✅ PASS
- [x] Technical Context: Complete
- [x] Project Structure: Documented
- [x] Phase 0 Plan: Research tasks defined
- [x] Phase 1 Plan: Design & Contracts tasks defined
- [x] Agent Context: Implementation guidance complete
- [x] All planning questions answered (translation organization, coverage target, logging)

**Status**: ✅ Plan complete - ready for task generation

**Next Command**: `/spec-kitty.tasks` to generate implementation work packages
