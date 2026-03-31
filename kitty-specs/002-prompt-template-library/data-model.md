# Data Model: Prompt Template Library

**Feature**: 002-prompt-template-library
**Date**: 2026-03-31
**Phase**: 1 — Design

## Entity Overview

Deze feature introduceert **geen nieuwe modellen**. Het bestaande `GenerationTemplate` model (WP01) heeft alle vereiste velden. De feature voegt een service-laag en cache-laag toe.

## Bestaand Model: GenerationTemplate

**Locatie**: [src/generative/models.py](../../src/generative/models.py) (L128-280)
**Tabel**: `generative_template`

### Velden

| Field | Type | WP01? | Gebruikt door |
|-------|------|-------|---------------|
| `organisation` | FK → Organisation (nullable) | ✅ | Org-scoping, global templates (null org) |
| `name` | CharField(200) | pre-existing | Admin display, API response |
| `slug` | SlugField(100) | pre-existing | Template lookup key (PromptService) |
| `version` | CharField(20) | pre-existing | Versioning (not activated in this feature) |
| `description` | TextField | pre-existing | API response, Admin UI |
| `template_type` | CharField(20) | pre-existing | Categorisatie (member/season/match) |
| `template_subtype` | CharField(30) | pre-existing | Subcategorisatie (profile_photo, flyer, etc.) |
| `input_schema` | JSONField | pre-existing | Vervangt legacy `input_requirements` |
| `pipeline_config` | JSONField | pre-existing | Bevat `output_type`, `provider`, `model` |
| `prompt_text` | TextField | ✅ WP01 | De prompt template met `{placeholder}` variabelen |
| `parameters_schema` | JSONField | ✅ WP01 | Parameter definities: `{key: {label, type, options, default}}` |
| `preprocessing_config` | JSONField | ✅ WP01 | Per-input type preprocessing: `{image_key: preprocessor_name}` |
| `is_active` | BooleanField | pre-existing | Soft delete / active filter |
| `is_latest` | BooleanField | pre-existing | Latest version flag |
| `created_by` | FK → User | pre-existing | Audit trail |
| `created_at` | DateTimeField | pre-existing | Timestamp |
| `updated_at` | DateTimeField | pre-existing | Timestamp (triggers cache invalidation) |

### Indexes (bestaand)

| Index | Fields | Purpose |
|-------|--------|---------|
| `org_active_idx` | `organisation`, `is_active` | Org-scoped active template queries |
| `slug_ver_idx` | `slug`, `version` | Template lookup by slug |
| `created_idx` | `created_at` | Ordering |

### Unique Constraint

`unique_together = [("organisation", "slug", "version")]`

## Legacy → DB Field Mapping

| Legacy (`teamreel_prompts.py`) | DB Field | Notes |
|-------------------------------|----------|-------|
| `TEMPLATES[id]["prompt_template"]` | `prompt_text` | 1:1 mapping, geseed in migration 0010 |
| `TEMPLATES[id]["parameters"]` | `parameters_schema` | 1:1 mapping, geseed in migration 0010 |
| `TEMPLATES[id]["preprocessing"]` | `preprocessing_config` | 1:1 mapping, geseed in migration 0010 |
| `TEMPLATES[id]["input_requirements"]` | `input_schema` | List → JSON Schema format |
| `TEMPLATES[id]["output_type"]` | `pipeline_config["output_type"]` | Embedded in pipeline_config JSON |
| `TEMPLATES[id]["video_config"]` | `pipeline_config["video_config"]` | Embedded in pipeline_config JSON |
| `TEMPLATES[id]["id"]` | `slug` | Template identifier |
| `TEMPLATES[id]["name"]` | `name` | Display name |
| `TEMPLATES[id]["category"]` | `template_subtype` | Categorisatie |
| `TEMPLATES[id]["description"]` | `description` | Template beschrijving |

## Nieuwe Service: PromptService

**Locatie**: `src/generative/services/prompt_service.py` (nieuw)
**Type**: Stateless service module (functies, geen class)

### Interface

```python
# Template lookup (cached)
def get_template(slug: str, organisation_id: int | None = None) -> GenerationTemplate:
    """Haalt template op uit cache of DB. Raises GenerationTemplateNotFound."""

# Prompt resolution
def resolve_prompt(
    template: GenerationTemplate,
    params: dict[str, str],
    kit_analysis: dict | None = None,
    extra_context: str | None = None,
) -> str:
    """Substitueert {placeholders} in prompt_text met resolved parameter values."""

# Active templates list (cached)
def get_active_templates(organisation_id: int | None = None) -> list[GenerationTemplate]:
    """Retourneert alle actieve templates voor een organisatie."""

# Cache invalidation (called by signal)
def invalidate_template_cache(slug: str | None = None) -> None:
    """Invalideert template cache. Als slug=None, invalideer alles."""
```

### Module-level Constants (migrated from teamreel_prompts.py)

```python
PARAM_RESOLVERS: dict[str, dict[str, str]]   # ~15 param types, ~80 value→text mappings
ROLE_EQUIPMENT: dict[str, str]                 # role → equipment prompt text
OUTFIT_STYLE_DETAILS: dict[str, str]           # outfit style → multi-line detail text
```

## Nieuw Signal: GenerationTemplate post_save

**Locatie**: `src/generative/signals.py` (nieuw)

```python
@receiver(post_save, sender=GenerationTemplate)
def invalidate_template_cache_on_save(sender, instance, **kwargs):
    """Invalideert prompt template cache bij elke save."""
    invalidate_template_cache(slug=instance.slug)
```

## Custom Exception

**Locatie**: `src/generative/services/prompt_service.py`

```python
class GenerationTemplateNotFound(Exception):
    """Raised when a template slug is not found in the database."""
    def __init__(self, slug: str):
        self.slug = slug
        super().__init__(f"Generation template not found: {slug}")
```

## Data Flow

```
Pipeline Request
    │
    ▼
PromptService.get_template(slug)
    │
    ├─ Cache HIT → return cached template
    │
    └─ Cache MISS → DB query → cache → return
           │
           ▼
PromptService.resolve_prompt(template, params)
    │
    ├─ template.prompt_text
    ├─ PARAM_RESOLVERS[param_type][value] → natural language
    ├─ Special cases (home_kit, user_instruction)
    │
    ▼
Resolved prompt string → AI Provider (Gemini/OpenAI)
```

```
Admin saves template
    │
    ▼
post_save signal
    │
    ▼
invalidate_template_cache(slug)
    │
    ▼
Next request → Cache MISS → fresh DB query
```
