---
work_package_id: WP06
title: Developer Documentation & Quickstart
lane: planned
subtasks:
  - T026
  - T027
  - T028
  - T029
  - T030
history:
  - date: 2025-11-23
    action: created
    author: spec-kitty.tasks
---

# WP06: Developer Documentation & Quickstart

## Objective

Create comprehensive developer documentation including data model conceptual guide, complete translation workflow quickstart, and update agent context with i18n/l10n patterns.

## Context

This is the documentation and knowledge-sharing work package. It builds on the Translation File Organization section started in WP03 and completes the full quickstart guide per Phase 1 of the implementation plan.

**Deliverables**:
- `data-model.md`: Conceptual entities (no DB models)
- `quickstart.md`: Complete 5-section translation workflow guide
- Updated agent context with i18n/l10n patterns

## Subtask Guidance

### T026: Create data-model.md Documenting Conceptual Entities

**Implementation**:
Create `kitty-specs/004-core-internationalization-base/data-model.md`:
```markdown
# Data Model: Core Internationalization Base Layer

## Overview

This feature is configuration-based with **no database models**. This document describes conceptual entities represented in files and Django settings.

## Conceptual Entities

### Translation Catalog

**Representation**: .po (source) and .mo (compiled) files
**Location**: `src/locale/<language>/LC_MESSAGES/django.po`

**Structure**:
- Message ID (msgid): Unique key for translatable string
- Translation (msgstr): Localized string for target language
- Context (msgctxt): Optional disambiguation
- Metadata: Language, charset, plural rules

**Example**:
\`\`\`po
msgid "user.created.success"
msgstr "User created successfully"
\`\`\`

### Locale Configuration

**Representation**: Django settings in `src/config/settings/base.py`

**Settings**:
- `LANGUAGE_CODE`: Default language ('en-us')
- `TIME_ZONE`: Default timezone ('UTC')
- `LANGUAGES`: Available languages [('en', 'English')]
- `USE_I18N`: Enable translations (True)
- `USE_L10N`: Enable localization (True)
- `USE_TZ`: Enable timezone support (True)
- `LOCALE_PATHS`: Translation file directories

### Language Fallback Chain

**Representation**: Django's translation resolution algorithm

**Sequence**:
1. Requested language (e.g., 'fr-CA')
2. Language family (e.g., 'fr')
3. Default language ('en-us')

**Behavior**: Automatic fallback if translation missing at any level.
```

**Acceptance**: data-model.md documents all 3 conceptual entities with clear explanations.

---

### T027: Create quickstart.md Section 1: Marking Strings [P]

**Implementation**:
Expand `quickstart.md` (already has Translation File Organization from WP03):
```markdown
## Marking Strings as Translatable

### Python Code

Import translation functions:
\`\`\`python
from django.utils.translation import gettext, gettext_lazy
\`\`\`

**For runtime translation** (views, functions):
\`\`\`python
def my_view(request):
    message = gettext("Welcome to the application")
    return HttpResponse(message)
\`\`\`

**For lazy evaluation** (model fields, class attributes):
\`\`\`python
class MyModel(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name=gettext_lazy("Name")
    )
\`\`\`

**With variables** (use % formatting):
\`\`\`python
message = gettext("Hello, %(username)s") % {'username': user.username}
\`\`\`

### Django Templates

Load i18n tags:
\`\`\`django
{% load i18n %}
\`\`\`

**Simple translation**:
\`\`\`django
<h1>{% trans "Welcome" %}</h1>
\`\`\`

**With variables**:
\`\`\`django
{% blocktrans with name=user.name %}
    Hello, {{ name }}!
{% endblocktrans %}
\`\`\`

**Pluralization**:
\`\`\`django
{% blocktrans count counter=items|length %}
    There is {{ counter }} item.
{% plural %}
    There are {{ counter }} items.
{% endblocktrans %}
\`\`\`
```

**Acceptance**: Section 1 complete with Python and template examples.

---

### T028: Create quickstart.md Sections 2-3: Extraction and Compilation [P]

**Implementation**:
```markdown
## Generating Translation Files

### Extract Translatable Strings

Run makemessages to collect strings:
\`\`\`bash
django-admin makemessages -l en_US
\`\`\`

This creates/updates `src/locale/en_US/LC_MESSAGES/django.po`

**For per-app translations**:
\`\`\`bash
cd src/my_app
django-admin makemessages -l en_US
\`\`\`

### Edit Translation Files

Open `.po` file in text editor or Poedit:
\`\`\`po
msgid "Welcome"
msgstr "Welcome"  # Edit this line
\`\`\`

## Compiling Translations

After editing, compile to binary format:
\`\`\`bash
django-admin compilemessages
\`\`\`

This creates `.mo` files which Django uses at runtime.

**When to compile**:
- After editing .po files
- Before deploying to production
- After pulling translation updates from version control
```

**Acceptance**: Sections 2-3 complete with makemessages and compilemessages workflows.

---

### T029: Create quickstart.md Sections 4-5: Adding Languages and Testing [P]

**Implementation**:
```markdown
## Adding a New Language

1. Update `LANGUAGES` in `src/config/settings/base.py`:
\`\`\`python
LANGUAGES = [
    ('en', 'English'),
    ('fr', 'French'),  # Add this
]
\`\`\`

2. Generate translation file:
\`\`\`bash
django-admin makemessages -l fr
\`\`\`

3. Translate strings in `src/locale/fr/LC_MESSAGES/django.po`

4. Compile:
\`\`\`bash
django-admin compilemessages
\`\`\`

5. Restart server

## Testing Translations

### In Tests

\`\`\`python
from django.test import TestCase
from django.utils.translation import activate, gettext

class MyTest(TestCase):
    def test_french_translation(self):
        activate('fr')
        msg = gettext("Welcome")
        self.assertEqual(msg, "Bienvenue")
\`\`\`

### Manually

1. Change language in browser dev tools (Accept-Language header)
2. Or use Django admin language selector (if user preferences implemented)
3. Verify translated content appears
```

**Acceptance**: Sections 4-5 complete with language addition and testing workflows.

---

### T030: Update Agent Context with i18n/l10n Patterns

**Implementation**:
1. Run: `.kittify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
2. Verify context includes:
   - Django translation framework patterns (gettext, gettext_lazy)
   - Translation file organization (hybrid: centralized + per-app)
   - gettext utilities (makemessages, compilemessages)
   - Testing patterns for i18n/l10n
   - Structured logging fields for translation events

**Acceptance**: Agent context updated with i18n/l10n technology patterns.

---

## Definition of Done

- [ ] data-model.md created with 3 conceptual entities
- [ ] quickstart.md Section 1: Marking Strings complete
- [ ] quickstart.md Section 2: Generating Translation Files complete
- [ ] quickstart.md Section 3: Compiling Translations complete
- [ ] quickstart.md Section 4: Adding a New Language complete
- [ ] quickstart.md Section 5: Testing Translations complete
- [ ] All code examples are syntactically correct and tested
- [ ] Commands are valid for bash and PowerShell where applicable
- [ ] Agent context updated with i18n/l10n patterns
- [ ] Documentation has no placeholders or [TBD] markers

## Dependencies

- WP01 (research provides foundation)
- WP02-WP05 (documentation reflects actual implementation)

## Reviewer Guidance

Verify documentation is accurate, complete, and actionable. Test code examples for correctness.
