---
work_package_id: WP01
title: Research & Framework Documentation
lane: "doing"
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
agent: "copilot"
shell_pid: "27084"
history:
  - date: 2025-11-23
    action: created
    author: spec-kitty.tasks
---

# WP01: Research & Framework Documentation

## Objective

Document Django i18n/l10n framework decisions, translation organization patterns, workflow best practices, fallback strategy, and testing approach to guide implementation of the internationalization base layer.

## Context

This is the foundational work package for Feature 004 (Core Internationalization Base Layer). The research phase establishes the framework selection rationale, architectural patterns, and testing strategy that all subsequent work packages will follow.

**Key Decisions to Document**:
- Why Django's built-in i18n/l10n framework (vs alternatives like gettext alone or custom solutions)
- When to use centralized (`src/locale/`) vs per-app (`src/<app>/locale/`) translation organization
- How developers should mark strings as translatable in Python and Django templates
- How the language fallback chain works (requested → language family → English US)
- How structured logging integrates with translation events for observability
- What testing patterns apply to i18n/l10n (fixtures, fallback tests, middleware tests)

**Reference Documents**:
- Spec: `kitty-specs/004-core-internationalization-base/spec.md`
- Plan: `kitty-specs/004-core-internationalization-base/plan.md`
- Django i18n docs: https://docs.djangoproject.com/en/5.1/topics/i18n/

## Subtask Guidance

### T001: Create research.md with Framework Decision Rationale

**What to deliver**: A `research.md` file in the feature specs directory documenting the framework selection.

**Implementation**:
1. Create file: `kitty-specs/004-core-internationalization-base/research.md`
2. Include sections:
   - **Framework Selected**: Django built-in i18n/l10n framework
   - **Rationale**: Battle-tested, well-documented, zero additional dependencies, tight Django integration
   - **Alternatives Considered**:
     - gettext alone: Rejected due to lack of Django ORM/template integration
     - Custom solution: Rejected due to unnecessary complexity and maintenance burden
     - Third-party packages (django-rosetta, django-modeltranslation): Rejected as overkill for base layer
   - **Key Benefits**: Caching, lazy translation, pluralization, template integration, middleware support
3. Reference Django i18n documentation link
4. Note compatibility with future B12 (user/org preferences) feature

**Acceptance**: research.md exists with framework selection, rationale, and alternatives documented clearly.

---

### T002: Document Hybrid Translation Organization Pattern

**What to deliver**: Clear guidance on when to use centralized vs per-app translation files.

**Implementation**:
1. In `research.md`, add "Translation Organization" section
2. Document **Hybrid Approach**:
   - **Centralized** (`src/locale/`): Cross-cutting messages (authentication, errors, common UI elements)
   - **Per-app** (`src/<app>/locale/`): App-specific domain messages (constitution_engine messages stay in constitution_engine/)
3. Explain tradeoffs:
   - Centralized: Easier to maintain consistency, single translation review point
   - Per-app: Better isolation, allows independent app deployment, clearer ownership
4. Provide decision matrix:
   - Message used by multiple apps → centralized
   - Message specific to one app's domain logic → per-app
   - Validation errors for shared models → centralized
   - App-specific feature messages → per-app
5. Note: Initial implementation uses centralized only (per-app is documented for future)

**Acceptance**: Hybrid organization pattern documented with clear decision criteria and examples.

---

### T003: Document Translation Marking Best Practices

**What to deliver**: Code examples showing how developers mark strings as translatable.

**Implementation**:
1. In `research.md`, add "Translation Marking Patterns" section
2. Document **Python patterns**:
   ```python
   from django.utils.translation import gettext, gettext_lazy

   # For runtime translation (views, functions)
   message = gettext("User created successfully")

   # For lazy evaluation (model fields, class attributes)
   class MyModel(models.Model):
       verbose_name = gettext_lazy("My Model")

   # For f-strings (concatenate, don't interpolate)
   error = gettext("User %(username)s not found") % {'username': username}
   ```

3. Document **Template patterns**:
   ```django
   {% load i18n %}

   {# Simple translation #}
   <h1>{% trans "Welcome" %}</h1>

   {# Translation with context #}
   {% trans "Welcome" context "homepage greeting" %}

   {# Block translation with variables #}
   {% blocktrans with name=user.name %}
       Hello {{ name }}!
   {% endblocktrans %}

   {# Pluralization #}
   {% blocktrans count counter=list|length %}
       There is {{ counter }} item.
   {% plural %}
       There are {{ counter }} items.
   {% endblocktrans %}
   ```

4. Document **Anti-patterns to avoid**:
   - Don't: `gettext(f"Hello {name}")` (interpolation breaks extraction)
   - Don't: String concatenation for translations
   - Don't: HTML in translatable strings (use template tags instead)

**Acceptance**: Translation marking patterns documented with correct and incorrect examples for both Python and templates.

---

### T004: Document Language Fallback Strategy with Structured Logging

**What to deliver**: Clear specification of fallback chain and logging integration.

**Implementation**:
1. In `research.md`, add "Fallback Strategy" section
2. Document **Fallback Chain**:
   - **Step 1**: Requested language (e.g., `fr-CA` for French Canadian)
   - **Step 2**: Language family (e.g., `fr` if `fr-CA` not found)
   - **Step 3**: Default language (English US: `en-us`)
   - **Behavior**: Django handles this automatically via LANGUAGES setting
3. Document **Graceful Degradation**:
   - Missing translation → fallback to next in chain
   - Malformed .po file → log error, skip file, use fallback
   - Missing .mo file → log warning, fall back to source strings
4. Document **Structured Logging Fields**:
   - `translation_key`: The message ID being translated (e.g., "user.created.success")
   - `language_code`: Target language (e.g., "fr-CA")
   - `fallback_reason`: Why fallback occurred (e.g., "missing_translation", "malformed_file", "language_not_configured")
5. Document **Log Levels**:
   - WARNING: Fallback due to missing translation (expected during development)
   - ERROR: Malformed translation file or compilation failure (needs immediate attention)
6. Provide example log entry:
   ```json
   {
     "level": "WARNING",
     "logger": "django.translation",
     "timestamp": "2025-11-23T14:30:00Z",
     "translation_key": "user.login.success",
     "language_code": "fr",
     "fallback_reason": "missing_translation",
     "message": "Translation not found, falling back to en-us"
   }
   ```

**Acceptance**: Fallback chain documented with structured logging fields and example log entries.

---

### T005: Document i18n Testing Patterns and Coverage Target

**What to deliver**: Testing strategy for i18n/l10n functionality with 80% coverage target.

**Implementation**:
1. In `research.md`, add "Testing Strategy" section
2. Document **Test Fixture Approach**:
   - Create sample .po files in `tests/fixtures/translations/`
   - English (complete): All strings translated
   - French (partial): Some strings missing to test fallback
   - Malformed (invalid syntax): To test error handling
3. Document **Test Categories**:
   - **Translation Loading**: Verify .po files load correctly
   - **Translation Rendering**: Mark string, verify rendered output
   - **Fallback Behavior**: Request missing translation, verify English fallback
   - **Middleware Functionality**: Verify LocaleMiddleware activates correct language
   - **Timezone Handling**: Verify datetime values stored in UTC
   - **Integration Tests**: Run makemessages/compilemessages, verify workflow
4. Document **Test Examples**:
   ```python
   from django.test import TestCase, override_settings
   from django.utils import translation

   class TranslationTest(TestCase):
       def test_translation_rendering(self):
           with translation.override('en'):
               msg = gettext("Hello")
               self.assertEqual(msg, "Hello")

       def test_fallback_to_english(self):
           with translation.override('fr'):
               # Assuming 'Missing' is not in French .po
               msg = gettext("Missing")
               self.assertEqual(msg, "Missing")  # Falls back to source
   ```
5. Document **Coverage Target**:
   - 80% line coverage for:
     - `src/config/settings/base.py` (i18n configuration)
     - `src/common/translation_logging.py` (if created)
   - Run: `pytest --cov=src/config/settings --cov=src/common --cov-report=term`
   - Coverage excludes Django framework code (focus on our configuration)

**Acceptance**: Testing strategy documented with fixture approach, test categories, examples, and 80% coverage target specified.

---

## Definition of Done

- [ ] `research.md` file created in feature specs directory
- [ ] Framework selection documented with rationale and alternatives
- [ ] Hybrid translation organization pattern explained with decision criteria
- [ ] Translation marking patterns documented for Python and templates
- [ ] Anti-patterns identified and explained
- [ ] Fallback strategy documented with 3-step chain
- [ ] Structured logging fields specified (translation_key, language_code, fallback_reason)
- [ ] Example log entries provided
- [ ] Testing strategy documented with fixture approach
- [ ] Test categories enumerated (loading, rendering, fallback, middleware, timezone, integration)
- [ ] Test code examples provided
- [ ] 80% coverage target specified with scope defined
- [ ] Document is complete with no placeholders or [TBD] markers
- [ ] All links and references are valid

## Risks & Mitigations

**Risk**: Documentation becomes outdated as implementation evolves
**Mitigation**: Review research.md after each subsequent work package, update as needed

**Risk**: Examples may not run correctly when tested
**Mitigation**: Keep examples minimal and based on Django documentation

**Risk**: Structured logging fields may be too verbose or insufficient
**Mitigation**: Start with proposed fields (translation_key, language_code, fallback_reason), iterate based on WP04 implementation

## Dependencies

- None (foundational work package)

## Reviewer Guidance

**What to verify**:
1. Framework rationale is clear and alternatives are fairly evaluated
2. Hybrid organization pattern provides actionable decision criteria
3. Translation marking examples are syntactically correct and follow Django best practices
4. Fallback chain is unambiguous (3 steps clearly defined)
5. Structured logging fields enable observability (can diagnose translation issues from logs)
6. Testing strategy is comprehensive enough to achieve 80% coverage
7. Document is well-organized and easy to navigate

**What NOT to focus on**:
- Perfect prose or formatting (content > style)
- Exhaustive Django i18n documentation (reference official docs, don't duplicate)
- Implementation details (this is research/planning, not code)

**Red flags**:
- Vague decision criteria ("use centralized when appropriate")
- Missing alternatives considered
- Incomplete fallback chain (must specify all 3 levels)
- No coverage target or scope defined
- Placeholders like [TBD] or [TODO]

## Activity Log

- 2025-11-23T19:08:32Z – copilot – shell_pid=27084 – lane=doing – Started implementation
