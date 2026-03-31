# Structured Output Validation

## Overview

Runtime validation layer voor AI-gegenereerde content in de generative pipeline. Valideert JSON outputs van LLM providers (Gemini, OpenAI, MiniMax) met Pydantic v2 schemas, severity-based error handling, en gedetailleerde error reporting met field paths.

**Primaire focus**: Line-up JSON validatie — de meest structureel complexe output die downstream processen voedt (wedstrijdgraphics, video overlays, social posts).

## Problem Statement

De huidige generative pipeline mist systematische output validatie:

1. **Silent failures**: Gemini kan lege `parts[]` teruggeven die door lege loops glippen
2. **Fragile parsing**: Photo validation splitst op `"\n"` en assumeert exacte formatting
3. **Geen schema enforcement**: AI output wordt niet gevalideerd tegen verwachte structuren
4. **Inconsistente error handling**: Sommige fouten worden gelogd en doorgegeven, andere masked

**Impact**: Corrupte JSON kan de hele content pipeline breken. Gebruikers krijgen geen bruikbare foutmeldingen wanneer AI output faalt.

## User Scenarios

### US-001: Content Manager Reviews Line-up
Een content manager importeert een line-up voor een wedstrijd. De AI genereert een JSON met spelerposities, maar één speler mist een rugnummer.

**Expected behavior**: 
- Validatie detecteert het missende veld
- Content manager ziet: "Speler 'Jan Bakker' mist rugnummer (positie 0.spelers.3.rugnummer)"
- Line-up wordt niet opgeslagen totdat gecorrigeerd

### US-002: Video Generation with Invalid Timing
Celery worker genereert video met AI-gegenereerde timing parameters. De AI retourneert een negatieve duration.

**Expected behavior**:
- Validatie detecteert: `duration: -5` is ongeldig (moet > 0)
- Task faalt met duidelijke error in GenerationRequest.metadata
- Retry wordt ingepland met exponential backoff

### US-003: Social Caption with Type Coercion
AI retourneert een hashtag count als string `"5"` in plaats van integer `5`.

**Expected behavior**:
- Validator coerceert string naar int (compatible types)
- Log warning: "Type coerced: hashtag_count string→int"
- Content genereert succesvol

## Success Criteria

- Alle AI outputs in de generative pipeline worden gevalideerd voordat ze opgeslagen worden
- Validatiefouten bevatten field path en menselijke beschrijving
- Type coercion werkt voor compatible types (string↔int, string↔float)
- Content managers begrijpen validatiefouten zonder technische kennis
- Geen regressie in bestaande pipeline performance (<50ms overhead per validatie)

---

## Functional Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| FR-001 | Systeem valideert JSON output tegen Pydantic v2 schemas | Draft |
| FR-002 | Systeem genereert error messages met field path (bijv. `spelers.0.rugnummer`) | Draft |
| FR-003 | Systeem coerceert compatible types automatisch (string→int, string→float, int→string) | Draft |
| FR-004 | Systeem registreert schemas via code-defined Pydantic models (geen database config) | Draft |
| FR-005 | Systeem integreert validatie in `generate_asset` en `generate_video` pipeline | Draft |
| FR-006 | Systeem valideert Gemini image responses op aanwezigheid van `inline_data` parts | Draft |
| FR-007 | Systeem valideert MiniMax video status tegen bekende TERMINAL/PENDING statussen | Draft |
| FR-008 | Systeem past severity-based error handling toe (critical/warning/info) | Draft |
| FR-009 | Systeem logt validatiefouten naar structured logging met request context | Draft |
| FR-010 | Systeem biedt `@validate_output` decorator voor Celery tasks en views | Draft |

## Non-Functional Requirements

| ID | Requirement | Threshold | Status |
|----|-------------|-----------|--------|
| NFR-001 | Validatie overhead per AI response | <50ms p95 | Draft |
| NFR-002 | Schema registry startup time | <100ms | Draft |
| NFR-003 | Memory footprint van schema registry | <10MB | Draft |
| NFR-004 | Foutmeldingen zijn i18n-ready (format strings, niet hardcoded NL) | 100% | Draft |

## Constraints

| ID | Constraint | Status |
|----|------------|--------|
| C-001 | Geen database migrations voor schema storage — schemas zijn code-defined | Accepted |
| C-002 | Backwards compatible met bestaande GenerationRequest/GenerationOutput models | Accepted |
| C-003 | Pydantic v2 — geen v1 compatibility layer | Accepted |
| C-004 | Geen frontend impact — dit is pure backend validatie | Accepted |

---

## Key Entities

### OutputSchema (Pydantic BaseModel)
Abstract base voor alle output schemas. Subclasses definiëren specifieke structures.

```python
class OutputSchema(BaseModel):
    model_config = ConfigDict(
        strict=False,  # Allow coercion
        extra="forbid",  # No unknown fields
    )
```

### LineupSchema
Schema voor line-up JSON output.

**Fields**:
- `team_name: str` — teamnaam
- `formation: str` — formatie (bijv. "4-3-3")
- `players: list[PlayerSchema]` — spelerlijst

### PlayerSchema
**Fields**:
- `name: str` — spelernaam
- `number: int` — rugnummer (1-99)
- `position: str` — positie code

### ValidationResult
**Fields**:
- `is_valid: bool`
- `errors: list[ValidationError]`
- `coercions: list[CoercionWarning]`
- `raw_data: dict` — originele input
- `validated_data: dict | None` — gevalideerde output (indien valid)

### ValidationError
**Fields**:
- `field_path: str` — bijv. `players.0.number`
- `message: str` — menselijke beschrijving
- `severity: Literal["critical", "warning", "info"]`
- `code: str` — machineleesbare code (bijv. `MISSING_REQUIRED_FIELD`)

---

## Assumptions

1. **Pydantic v2 compatibility**: Django 5 + Pydantic v2 werken samen zonder issues (verified in codebase: pydantic al in requirements)
2. **Schema stability**: AI output schemas veranderen niet vaak; code-defined is acceptabel
3. **No external schemas**: Geen behoefte om JSON Schema van externe bronnen te laden
4. **English error codes**: Error codes zijn Engels; messages kunnen i18n krijgen later

## Dependencies

- **pydantic v2**: Al aanwezig in requirements (verified)
- **src/generative/**: Bestaande pipeline waar validatie integreert
- **src/generative/services/asset_pipeline.py**: Primaire integratiepunt
- **src/generative/tasks.py**: ErrorCategory enum voor retry logic

## Out of Scope

- Frontend/Zod validatie (apart concern)
- GraphQL schema validatie
- Database constraint validatie (Django ORM responsibility)
- Admin interface voor schema configuratie
- Historical validation log storage (geen ValidationLog model)

---

## Acceptance Scenarios

### Scenario 1: Valid Line-up Passes
**Given** een AI response met complete line-up JSON
**When** validatie wordt uitgevoerd
**Then** `is_valid=True`, `errors=[]`, `validated_data` bevat typed dict

### Scenario 2: Missing Required Field Fails
**Given** een AI response waar `players[0].number` ontbreekt
**When** validatie wordt uitgevoerd
**Then** `is_valid=False`, error met `field_path="players.0.number"`, `severity="critical"`

### Scenario 3: Type Coercion Succeeds with Warning
**Given** een AI response met `number="7"` (string i.p.v. int)
**When** validatie wordt uitgevoerd
**Then** `is_valid=True`, `coercions` bevat warning, `validated_data.number=7` (int)

### Scenario 4: Unknown Field Rejected
**Given** een AI response met extra field `players[0].nickname`
**When** validatie wordt uitgevoerd met `extra="forbid"`
**Then** `is_valid=False`, error met `code="EXTRA_FIELD_NOT_ALLOWED"`

### Scenario 5: Gemini Empty Parts Detected
**Given** Gemini response met `candidates[0].content.parts=[]`
**When** asset_pipeline valideert response
**Then** Error raised met message "No IMAGE part in Gemini response"

### Scenario 6: MiniMax Unknown Status Warned
**Given** MiniMax returns `status="Paused"` (niet in bekende statussen)
**When** minimax_client pollt status
**Then** Warning logged, polling continueert (geen crash)

---

## Edge Cases

1. **Deeply nested validation**: `players.0.stats.goals.season` — field path moet volledig pad tonen
2. **List index in path**: Errors in list items tonen index: `players.2.name`
3. **Empty response**: AI retourneert `null` of `{}` — duidelijke "Empty response" error
4. **Partial coercion**: Sommige fields coercen, andere niet — alle coercions gelogd
5. **Circular references**: Pydantic handled dit; test dat geen infinite loop

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance impact door validatie | Low | Medium | Pydantic v2 is snel; benchmark voor/na |
| Breaking existing pipeline | Medium | High | Feature flag om validatie soft te enablen |
| Schema drift vs AI output | Medium | Medium | Versioned schemas; logging van validation failures |

---

## Implementation Notes

### Integratiepunten (uit codebase research)

1. **asset_pipeline.py:270** — Gemini response validatie
2. **asset_pipeline.py:365-380** — Result aggregation validatie
3. **gemini_image.py:265-280** — Photo composite parsing (regex i.p.v. line split)
4. **minimax_client.py:185-210** — Status enum validatie
5. **tasks.py** — ErrorCategory uitbreiden met VALIDATION_ERROR

### Schema Registry Pattern

```python
# src/validation/registry.py
class SchemaRegistry:
    _schemas: dict[str, type[OutputSchema]] = {}
    
    @classmethod
    def register(cls, name: str):
        def decorator(schema_cls):
            cls._schemas[name] = schema_cls
            return schema_cls
        return decorator
    
    @classmethod
    def get(cls, name: str) -> type[OutputSchema]:
        return cls._schemas[name]
```

### Decorator Pattern

```python
@validate_output(schema="lineup", severity="critical")
def generate_lineup(context: dict) -> dict:
    ...
```
