# Research: Structured Output Validation

**Feature**: 003-structured-output-validation  
**Date**: 2026-03-31  
**Phase**: Plan (Phase 0)

## Codebase Analysis

### Current Validation Gaps

Geïdentificeerd via Explore subagent onderzoek van `src/generative/`:

#### 1. Gemini Response Validation (`asset_pipeline.py:270`)

```python
# Current: No validation, assumes parts[] exists and is non-empty
response = await model.generate_content_async(contents)
text = response.candidates[0].content.parts[0].text
```

**Gap**: Geen check voor:
- `response.candidates` empty/None
- `parts[]` empty array
- `text` is niet JSON-parseable

**Impact**: Silent failures, corrupt GenerationOutput records

#### 2. Photo Composite Parsing (`gemini_image.py:265-280`)

```python
# Current: Fragile string parsing
lines = text.strip().split('\n')
for line in lines:
    parts = line.split('|')  # Assumes exact 4 parts
    person_id, x, y, scale = parts
```

**Gap**: Geen type validation:
- `person_id` moet int zijn
- `x, y, scale` moeten floats zijn
- Geen bounds checking

**Impact**: TypeError crashes in Celery worker

#### 3. MiniMax Status Validation (`minimax_client.py:185-210`)

```python
# Current: String comparison without enum validation
status = response["data"]["status"]
if status == "Success":
    ...
elif status == "Processing":
    ...
```

**Gap**: Geen Enum voor valid statuses, geen handling voor unknown status

**Impact**: Unknown status → unhandled state → job stuck

#### 4. Error Category Classification (`tasks.py`)

```python
class ErrorCategory(str, Enum):
    PROVIDER_ERROR = "provider_error"
    RATE_LIMIT = "rate_limit"
    CONTENT_POLICY = "content_policy"
    # Missing: VALIDATION_ERROR
```

**Gap**: Geen aparte categorie voor validation failures, nu gecategoriseerd als PROVIDER_ERROR

**Impact**: Kan niet differentiëren tussen provider issues en onze parsing/validation issues

## Technology Research

### Pydantic v2 voor Django

**Compatibiliteit**: ✅ Volledig compatible met Django 5 en DRF

Bewezen pattern in codebase:
- `requirements/base.txt` bevat al `pydantic>=2.0`
- Gebruikt in `src/generative/models.py` voor JSON schema validation

**Voordelen Pydantic v2**:
1. **Type coercion**: `str "123"` → `int 123` automatisch
2. **Field validators**: Custom validation per field met `@field_validator`
3. **Model validators**: Cross-field validation met `@model_validator`
4. **JSON Schema export**: `.model_json_schema()` voor documentatie
5. **Performance**: 3-5x sneller dan v1 (Rust core)

### Registry Pattern Choice

Onderzocht 3 opties:

| Pattern | Pros | Cons |
|---------|------|------|
| **Module-level dict** | Simpel, geen boilerplate | Geen lazy loading |
| **Class-based singleton** | Full OOP, extensible | Overkill voor use case |
| **Django settings variable** | Django-native | Tight coupling met settings |

**Keuze**: Module-level dict met `@register` decorator

```python
# Simple, explicit, testable
@register("lineup")
class LineupSchema(BaseModel):
    ...
```

### Error Handling Strategy

Onderzocht bestaande patterns in `src/`:

1. **DRF ValidationError** — voor API input validation
2. **Celery retry logic** — voor transient failures
3. **structlog** — voor structured logging

**Keuze**: Custom `ValidationError` met severity levels die integreert met:
- Celery retry voor CRITICAL errors
- structlog voor WARNING/INFO logging
- DRF-compatible error format voor API responses

## Integration Points

### Entry Points voor Validation

| Location | Trigger | Schema |
|----------|---------|--------|
| `asset_pipeline.py` | Gemini API response | `GeminiResponseSchema` |
| `gemini_image.py` | Photo composite parse | `PhotoCompositeSchema` |
| `minimax_client.py` | Video status check | `MiniMaxStatusSchema` |
| `tasks.py` | GenerationOutput save | Per-template schemas (e.g., `LineupSchema`) |

### Decorator Integration

```python
# Before:
def process_gemini_response(response: dict) -> dict:
    # Manual parsing, no validation
    return response["candidates"][0]["content"]["parts"][0]["text"]

# After:
@validate_output("gemini_response")
def process_gemini_response(response: dict) -> dict:
    return response["candidates"][0]["content"]["parts"][0]["text"]
```

## Performance Considerations

### Baseline Measurements (estimated)

| Operation | Current | With Validation |
|-----------|---------|-----------------|
| Gemini response parse | ~5ms | ~15ms |
| Line-up JSON validation | N/A | ~10ms |
| Photo composite parse | ~2ms | ~8ms |

**Target**: <50ms p95 voor validation overhead (inclusief error formatting)

### Optimization Strategies

1. **Schema caching**: Pydantic models compiled once, reused
2. **Lazy validation**: Only validate on first access if needed
3. **Batch validation**: ValidateMany for arrays
4. **Short-circuit**: Stop on first CRITICAL error

## Test Strategy

### Test Categories

| Category | Focus | Tools |
|----------|-------|-------|
| Unit | Individual validators, schemas | pytest, parametrize |
| Contract | Schema compliance | hypothesis (property-based) |
| Integration | Full pipeline flow | factory_boy, mock providers |

### Edge Cases Matrix

| Input | Expected | Test Priority |
|-------|----------|---------------|
| Empty JSON `{}` | CRITICAL error | High |
| Missing required field | CRITICAL error | High |
| Wrong type (non-coercible) | CRITICAL error | High |
| Wrong type (coercible) | WARNING + coerce | Medium |
| Extra fields | INFO + ignore | Low |
| Nested object invalid | CRITICAL with path | High |
| Array with invalid item | CRITICAL with index path | High |
| Null vs missing | Schema-dependent | Medium |

## Decisions Log

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| Pydantic v2 | Already in deps, type coercion, fast | JSON Schema (no coercion), marshmallow (slower) |
| Registry pattern | Simple, explicit | Class singleton (overkill), settings (coupling) |
| Severity enum | Graceful degradation | Fail-fast (too strict), ignore all (too lenient) |
| Submodule in generative | Tight coupling to pipeline | Separate app (unnecessary isolation) |
| @validate_output decorator | Non-invasive integration | Manual validation calls (boilerplate) |
