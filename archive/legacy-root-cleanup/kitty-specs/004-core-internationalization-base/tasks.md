# Implementation Tasks: Core Internationalization Base Layer

**Feature**: 004-core-internationalization-base
**Branch**: `004-core-internationalization-base`
**Created**: 2025-11-23

## Overview

This document breaks down the Core Internationalization Base Layer feature into discrete work packages. Each work package is independently implementable and testable, with clear acceptance criteria and dependencies.

**Target**: 6 work packages covering research, configuration, testing, and documentation.
**Estimated Effort**: ~3-5 days for complete implementation
**MVP Scope**: WP01 + WP02 (research + settings configuration)

## Subtask Reference

### Setup & Research (T001-T005)
- **T001**: Create research.md documenting Django i18n/l10n framework decision
- **T002**: Document hybrid translation organization pattern (centralized + per-app)
- **T003**: Document translation marking best practices (Python + templates)
- **T004**: Document language fallback strategy with structured logging
- **T005**: Document i18n testing patterns and 80% coverage target

### Configuration (T006-T012)
- **T006**: Configure LANGUAGE_CODE='en-us' in settings/base.py
- **T007**: Configure TIME_ZONE='UTC' in settings/base.py
- **T008**: Enable i18n/l10n flags (USE_I18N, USE_L10N, USE_TZ) in settings/base.py
- **T009**: Configure LANGUAGES list with English (US) in settings/base.py
- **T010**: Configure LOCALE_PATHS in settings/base.py [P]
- **T011**: Add LocaleMiddleware to MIDDLEWARE in settings/base.py
- **T012**: Verify settings inheritance in local.py, production.py, staging.py [P]

### Directory Structure (T013-T015)
- **T013**: Create src/locale/ directory with en_US/LC_MESSAGES/ structure
- **T014**: Create .gitkeep files to preserve empty locale directories [P]
- **T015**: Document per-app locale directory pattern in quickstart.md

### Logging Infrastructure (T016-T018)
- **T016**: Create logging utility for translation events with structured fields
- **T017**: Implement fallback logging (translation_key, language_code, fallback_reason)
- **T018**: Implement error logging for malformed translation files

### Testing (T019-T025)
- **T019**: Create test fixtures with sample .po files for testing
- **T020**: Write tests for translation loading and rendering [P]
- **T021**: Write tests for fallback behavior (missing translations) [P]
- **T022**: Write tests for locale middleware functionality [P]
- **T023**: Write tests for timezone handling (UTC storage) [P]
- **T024**: Write integration tests for translation workflow [P]
- **T025**: Verify 80% line coverage target achieved

### Documentation (T026-T030)
- **T026**: Create data-model.md documenting conceptual entities
- **T027**: Create quickstart.md Section 1: Marking Strings as Translatable [P]
- **T028**: Create quickstart.md Section 2-3: Message extraction and compilation [P]
- **T029**: Create quickstart.md Section 4-5: Adding languages and testing [P]
- **T030**: Update agent context with i18n/l10n patterns

---

## Work Package 1: Research & Framework Documentation (WP01)

**Priority**: P0 (Foundational)
**Status**: Planned
**Prompt**: [`tasks/planned/WP01-research-framework-documentation.md`](tasks/planned/WP01-research-framework-documentation.md)

### Objective
Document Django i18n/l10n framework decisions, translation organization patterns, workflow best practices, and testing strategy to guide implementation.

### Included Subtasks
- [x] T001: Create research.md with framework decision rationale
- [x] T002: Document hybrid translation organization (src/locale/ + per-app)
- [x] T003: Document translation marking patterns (gettext, {% trans %})
- [x] T004: Document fallback strategy and structured logging
- [x] T005: Document i18n testing patterns and coverage target

### Implementation Sketch
1. Create `research.md` in FEATURE_DIR
2. Document Django i18n framework selection with alternatives considered
3. Explain hybrid translation organization (when to use centralized vs per-app)
4. Provide code examples for marking translatable strings in Python and templates
5. Define fallback chain: requested → language family → English (US)
6. Document structured logging fields: translation_key, language_code, fallback_reason
7. Outline testing approach: fixtures, fallback tests, middleware tests, 80% coverage

### Success Criteria
- research.md exists with all 5 decision areas documented
- Framework rationale includes alternatives (gettext alone, custom solution)
- Translation organization explains centralized vs per-app tradeoffs
- Code examples cover Python (gettext/gettext_lazy) and templates ({% trans %}/{% blocktrans %})
- Fallback chain is clearly defined with logging integration
- Testing strategy specifies fixture approach and coverage target

### Dependencies
- None (foundational work package)

### Risks
- None (documentation-only)

---

## Work Package 2: Django Settings Configuration (WP02)

**Priority**: P0 (Foundational)
**Status**: Planned
**Prompt**: [`tasks/planned/WP02-django-settings-configuration.md`](tasks/planned/WP02-django-settings-configuration.md)

### Objective
Configure Django i18n/l10n settings in all environment configurations (base, local, production, staging) to enable translation infrastructure.

### Included Subtasks
- [x] T006: Set LANGUAGE_CODE='en-us' in settings/base.py
- [x] T007: Set TIME_ZONE='UTC' in settings/base.py
- [x] T008: Enable USE_I18N=True, USE_L10N=True, USE_TZ=True in settings/base.py
- [x] T009: Configure LANGUAGES=[('en', 'English')] in settings/base.py
- [x] T010: Configure LOCALE_PATHS=[BASE_DIR / 'locale'] in settings/base.py
- [x] T011: Add django.middleware.locale.LocaleMiddleware to MIDDLEWARE
- [x] T012: Verify settings inheritance in local.py, production.py, staging.py

### Implementation Sketch
1. Open `src/config/settings/base.py`
2. Locate existing i18n/l10n settings or add new section after imports
3. Set language and timezone: `LANGUAGE_CODE = 'en-us'`, `TIME_ZONE = 'UTC'`
4. Enable flags: `USE_I18N = True`, `USE_L10N = True`, `USE_TZ = True`
5. Define languages: `LANGUAGES = [('en', 'English')]`
6. Set locale paths: `LOCALE_PATHS = [BASE_DIR / 'locale']`
7. Add LocaleMiddleware to MIDDLEWARE list (after SessionMiddleware, before CommonMiddleware)
8. Verify local.py, production.py, staging.py inherit these settings correctly
9. Run Django check: `python manage.py check` to verify configuration

### Success Criteria
- All 6 i18n/l10n settings present in base.py
- LocaleMiddleware correctly positioned in MIDDLEWARE
- Settings inheritance verified in all environment configs
- `python manage.py check` passes with no errors
- No breaking changes to existing functionality

### Dependencies
- None (can run in parallel with WP01)

### Risks
- LocaleMiddleware position matters (must be after SessionMiddleware)
- Settings already exist and need updating rather than adding

---

## Work Package 3: Locale Directory Structure (WP03)

**Priority**: P1 (Core Feature)
**Status**: Planned
**Prompt**: [`tasks/planned/WP03-locale-directory-structure.md`](tasks/planned/WP03-locale-directory-structure.md)

### Objective
Create centralized locale directory structure for translation files and document per-app pattern for future use.

### Included Subtasks
- [x] T013: Create src/locale/en_US/LC_MESSAGES/ directory structure
- [x] T014: Add .gitkeep files to preserve empty directories
- [x] T015: Document per-app locale pattern in quickstart.md

### Implementation Sketch
1. Create directory: `src/locale/en_US/LC_MESSAGES/`
2. Create .gitkeep file in `src/locale/en_US/LC_MESSAGES/` (git tracks empty dirs)
3. Optionally create initial django.po stub with header metadata
4. Document in quickstart.md:
   - Centralized: `src/locale/` for cross-cutting messages
   - Per-app: `src/<app>/locale/` for app-specific translations
   - When to use each approach
5. Verify directory is recognized by Django: `python manage.py makemessages --dry-run`

### Success Criteria
- Directory `src/locale/en_US/LC_MESSAGES/` exists
- .gitkeep file present (directory tracked by git)
- quickstart.md documents both centralized and per-app patterns
- Django recognizes locale directory (makemessages --dry-run succeeds)

### Dependencies
- WP02 (settings must configure LOCALE_PATHS first)

### Risks
- Directory naming: en_US vs en-us vs en (use en_US for consistency with locale codes)

---

## Work Package 4: Structured Logging for Translation Events (WP04)

**Priority**: P1 (Core Feature)
**Status**: Planned
**Prompt**: [`tasks/planned/WP04-structured-logging-translation.md`](tasks/planned/WP04-structured-logging-translation.md)

### Objective
Implement structured logging for translation events including fallback warnings and error handling for malformed translation files.

### Included Subtasks
- [x] T016: Create logging utility module for translation events
- [x] T017: Implement fallback logging with structured fields
- [x] T018: Implement error logging for malformed translation files

### Implementation Sketch
1. Create `src/common/translation_logging.py` utility module
2. Define structured log fields: translation_key, language_code, fallback_reason
3. Create logger: `logger = logging.getLogger('django.translation')`
4. Implement `log_translation_fallback(key, language, reason)` function
5. Implement `log_translation_error(key, error_details)` function
6. Integrate with Django's translation system (signal handlers or middleware)
7. Document logging format in research.md or quickstart.md
8. Verify logs appear when fallback occurs (test with missing translation)

### Implementation Notes
- Django doesn't expose direct hooks for translation fallback events
- Options: Custom gettext wrapper, middleware inspection, or signal-based approach
- Simplest: Wrap `gettext`/`gettext_lazy` with logging layer
- Consider: Log only in production (avoid test noise) or use log levels

### Success Criteria
- translation_logging.py module exists with structured logging functions
- Fallback events log with translation_key, language_code, fallback_reason
- Malformed file errors log with clear error details
- Integration with Django translation system verified
- Logs visible during translation operations

### Dependencies
- WP02 (settings configuration)
- WP03 (locale structure for testing)

### Risks
- Django doesn't provide native translation fallback hooks
- May require custom wrapper or middleware approach
- Test noise if logging too verbose

---

## Work Package 5: Test Infrastructure & Coverage (WP05)

**Priority**: P1 (Core Feature)
**Status**: Planned
**Prompt**: [`tasks/planned/WP05-test-infrastructure-coverage.md`](tasks/planned/WP05-test-infrastructure-coverage.md)

### Objective
Create comprehensive test suite for i18n/l10n functionality including fixtures, unit tests, integration tests, and achieve 80% line coverage target.

### Included Subtasks
- [x] T019: Create test fixtures with sample .po files
- [x] T020: Write tests for translation loading and rendering
- [x] T021: Write tests for fallback behavior (missing translations)
- [x] T022: Write tests for locale middleware functionality
- [x] T023: Write tests for timezone handling (UTC storage)
- [x] T024: Write integration tests for translation workflow
- [x] T025: Verify 80% line coverage achieved

### Implementation Sketch
1. Create `tests/fixtures/translations/` directory structure
2. Create sample .po files: `en_US/LC_MESSAGES/django.po` (complete), `fr/LC_MESSAGES/django.po` (partial for fallback testing)
3. Create `tests/config/test_i18n_settings.py` for translation loading tests
4. Write unit tests:
   - `test_translation_loading`: Verify .po files load correctly
   - `test_translation_rendering`: Mark string as translatable, verify output
   - `test_fallback_to_english`: Request missing translation, verify English fallback
   - `test_locale_middleware`: Verify middleware activates correct language
   - `test_timezone_utc`: Create datetime, verify UTC storage
5. Write integration tests:
   - `test_makemessages_workflow`: Run makemessages, verify .po creation
   - `test_compilemessages_workflow`: Compile messages, verify .mo creation
6. Run coverage: `pytest --cov=src/config/settings --cov=src/common/translation_logging --cov-report=term`
7. Verify 80% threshold met

### Parallel Opportunities
- T020-T024 can be written simultaneously (different test files/concerns)

### Success Criteria
- Test fixtures exist with sample translations (complete + partial)
- All 6 test categories have passing tests
- Fallback behavior verified (missing translations → English)
- Middleware functionality verified (language activation)
- UTC timezone behavior verified (datetime storage)
- Integration tests cover makemessages/compilemessages
- Coverage report shows ≥80% for config/settings and translation_logging

### Dependencies
- WP02 (settings configuration)
- WP03 (locale structure)
- WP04 (logging infrastructure to test)

### Risks
- Fixture .po files must be correctly formatted (use django-admin makemessages to generate valid templates)
- Integration tests require gettext utilities installed
- Coverage may be affected by Django framework code (focus on our modules)

---

## Work Package 6: Developer Documentation & Quickstart (WP06)

**Priority**: P2 (Polish)
**Status**: Planned
**Prompt**: [`tasks/planned/WP06-developer-documentation-quickstart.md`](tasks/planned/WP06-developer-documentation-quickstart.md)

### Objective
Create comprehensive developer documentation including data model conceptual guide, translation workflow quickstart, and agent context updates.

### Included Subtasks
- [x] T026: Create data-model.md documenting conceptual entities
- [x] T027: Create quickstart.md Section 1: Marking Strings as Translatable
- [x] T028: Create quickstart.md Section 2-3: Message extraction and compilation
- [x] T029: Create quickstart.md Section 4-5: Adding languages and testing
- [x] T030: Update agent context with i18n/l10n patterns

### Implementation Sketch
1. **data-model.md**:
   - Document conceptual entities (no database models):
     - Translation Catalog (message IDs, translations, metadata in .po/.mo files)
     - Locale Configuration (language code, timezone, format settings in Django settings)
     - Language Fallback Chain (ordered list with English US default)
   - Document Django settings impact (LANGUAGE_CODE, TIME_ZONE, LANGUAGES, etc.)

2. **quickstart.md**:
   - Section 1: Marking strings as translatable
     - Python: `from django.utils.translation import gettext, gettext_lazy`
     - Templates: `{% load i18n %}`, `{% trans "text" %}`
     - Examples for both simple and complex translations
   - Section 2: Generating translation files
     - Command: `django-admin makemessages -l [language_code]`
     - Output: .po files, edit workflow
   - Section 3: Compiling translations
     - Command: `django-admin compilemessages`
     - Output: .mo files, when to run
   - Section 4: Adding a new language
     - Update LANGUAGES setting, run makemessages, translate, compile
   - Section 5: Testing translations
     - `override_settings(LANGUAGE_CODE='fr')`, `translation.activate('fr')`
     - Test fixture setup

3. **Agent Context**:
   - Run: `.kittify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
   - Add i18n/l10n context: framework patterns, file organization, gettext utilities, testing

### Parallel Opportunities
- T027-T029 can be written simultaneously (different sections of quickstart.md)

### Success Criteria
- data-model.md exists with all 3 conceptual entities documented
- data-model.md documents Django settings impact
- quickstart.md has all 5 sections complete with examples
- quickstart.md examples are copy-pasteable and tested
- Agent context updated with i18n/l10n patterns
- Documentation is accurate and complete (no placeholders)

### Dependencies
- WP01 (research provides foundation for documentation)
- WP02-WP05 (documentation reflects actual implementation)

### Risks
- Documentation can drift from implementation (keep in sync)
- Examples must be tested to ensure accuracy

---

## Implementation Sequence

### Phase 0: Foundation (Can parallelize)
1. **WP01** (Research) - Establish framework decisions
2. **WP02** (Settings) - Configure Django i18n/l10n

### Phase 1: Core Implementation (Sequential)
3. **WP03** (Locale Structure) - Depends on WP02
4. **WP04** (Logging) - Depends on WP02, WP03

### Phase 2: Validation & Documentation (Can parallelize)
5. **WP05** (Testing) - Depends on WP02, WP03, WP04
6. **WP06** (Documentation) - Depends on WP01, can parallel with WP05

**Critical Path**: WP02 → WP03 → WP04 → WP05
**Parallel Opportunities**: WP01 || WP02, WP05 || WP06

---

## MVP Recommendation

**Minimum Viable Product**: WP01 + WP02 + WP03

This delivers:
- Framework research and decisions (WP01)
- Django settings configured (WP02)
- Locale directory structure ready (WP03)

At this point, developers can:
- Mark strings as translatable
- Run makemessages/compilemessages
- See translations working

**Full Feature**: All 6 work packages

Adds:
- Structured logging for observability (WP04)
- Comprehensive test coverage (WP05)
- Complete developer documentation (WP06)

---

## Progress Tracking

### Setup & Foundational
- [ ] WP01: Research & Framework Documentation
- [ ] WP02: Django Settings Configuration
- [ ] WP03: Locale Directory Structure

### Core Features
- [ ] WP04: Structured Logging for Translation Events
- [ ] WP05: Test Infrastructure & Coverage

### Polish & Documentation
- [ ] WP06: Developer Documentation & Quickstart

### Completion Checklist
- [ ] All work packages completed
- [ ] All subtasks checked off
- [ ] 80% test coverage achieved
- [ ] Documentation complete (research.md, data-model.md, quickstart.md)
- [ ] Agent context updated
- [ ] Success criteria verified (from spec.md)
- [ ] Zero breaking changes confirmed
- [ ] Ready for code review

---

## Notes

- **No new Django apps**: This is pure configuration and documentation
- **No database migrations**: Configuration-based feature
- **Gettext utilities required**: Ensure `gettext` installed for makemessages/compilemessages
- **Testing approach**: Focus on configuration validation and workflow verification
- **80% coverage target**: Applied to settings files and logging utilities
- **Future compatibility**: Design supports B12 (user/org preferences) without changes
