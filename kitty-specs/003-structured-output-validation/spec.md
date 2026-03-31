# Media Pipeline Hardening

## Overview

Preventieve hardening van de complete media processing pipeline: AI providers (Gemini, MiniMax, Runway, Pika), FFmpeg video compositie, background removal (RVM, rembg), en image processing (PIL). Zorgt voor input validatie, resilience, output quality checks, en unified error handling.

**Doel**: Problemen voorkomen voordat ze ontstaan — niet reactief fixen, maar proactief beschermen.

## Problem Statement

De media pipeline verwerkt content via meerdere systemen, maar mist samenhangende validatie en error handling:

1. **Input validatie gaps**: Geen file size limits, geen PIL format checks op uploads
2. **Inconsistente retry**: MiniMax heeft goede retry, Gemini geen
3. **Silent FFmpeg errors**: Subprocess errors worden gelogd maar niet geparsed
4. **Geen output quality checks**: AI-gegenereerde images worden blind geaccepteerd
5. **Fragmenteerde logging**: Elke service logt anders, geen unified job tracking

**Impact**: Incidenten worden pas ontdekt als gebruikers klagen, niet proactief.

## User Scenarios

### US-001: Upload met corrupt image
Een content manager uploadt een logo dat technisch gezien een PNG heet maar corrupt is.

**Expected behavior**: 
- PIL validation detecteert corrupt bestand vóór processing
- Content manager ziet: "Afbeelding kan niet worden geopend. Upload een geldig PNG of JPEG."
- Upload wordt geweigerd, geen broken state in database

### US-002: Gemini rate limit tijdens batch
Tijdens 20 tenue-generaties raakt Gemini rate limited na 15 requests.

**Expected behavior**:
- Retry met exponential backoff (1s → 2s → 4s)
- Job 16-20 worden succesvol afgerond na retry
- Gebruiker ziet: "Verwerking voltooid" (niet "15/20 mislukt")

### US-003: FFmpeg timeout op zware video
Een lange video compositie (8K assets) duurt langer dan verwacht.

**Expected behavior**:
- FFmpeg process krijgt timeout warning bij 80% van limit
- Als daadwerkelijk timeout: duidelijke error "Video te complex, probeer met minder assets"
- Geen orphaned FFmpeg processes

### US-004: MiniMax retourneert lage kwaliteit
AI video generatie retourneert video die <720p is.

**Expected behavior**:
- Output quality check detecteert resolution mismatch
- Warning gelogd: "MiniMax returned 480p, expected 720p+"
- Job markeert als DEGRADED, niet SUCCESS

## Success Criteria

- 100% van uploads gevalideerd op format/size vóór processing
- Gemini calls hebben retry met tenacity (max 3, exponential backoff)
- FFmpeg errors geparsed naar actionable categorieën (OOM, timeout, codec)
- AI output dimensies/format gevalideerd na ontvangst
- Unified logging met job_id, provider, operation, duration

---

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Input validation: PIL format check voor alle uploaded images | P0 |
| FR-002 | Input validation: File size limits (20MB images, 500MB video) | P0 |
| FR-003 | Gemini retry: tenacity met exponential backoff, max 3 attempts | P0 |
| FR-004 | FFmpeg error parsing: categoriseer stderr naar OOM/timeout/codec/IO | P1 |
| FR-005 | Output quality: verificeer AI image dimensions/format na generatie | P1 |
| FR-006 | Unified logging: structured logs met job_id, provider, operation | P1 |
| FR-007 | Circuit breaker: disable provider na 5 consecutive failures | P2 |
| FR-008 | Health checks: endpoint per provider voor monitoring | P2 |

## Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| NFR-001 | Validation overhead per upload | <100ms p95 |
| NFR-002 | Retry latency (full backoff cycle) | <30s total |
| NFR-003 | FFmpeg error parse time | <10ms |
| NFR-004 | Unified log format compliance | 100% |

## Constraints

| ID | Constraint |
|----|------------|
| C-001 | Backwards compatible met bestaande FileAsset, GenerationRequest models |
| C-002 | Geen nieuwe Django models — utilities en service layer alleen |
| C-003 | Geen frontend impact — pure backend hardening |
| C-004 | Tenacity voor retry (al in requirements) |

---

## Key Components

### ImageValidator (nieuw)
Centrale PIL-based validatie voor image uploads.

**Methods**:
- `validate_format(file) → bool` — check magic bytes, niet alleen extension
- `validate_dimensions(file, max_w, max_h) → bool` — prevent memory exhaustion
- `validate_size(file, max_bytes) → bool` — enforce upload limits

### RetryConfig (tenacity wrapper)
Gestandaardiseerde retry configuratie voor AI providers.

**Settings**:
- `max_attempts: 3`
- `wait: exponential (1s, 2s, 4s)`
- `retry_on: (RateLimitError, ConnectionError, TimeoutError)`
- `stop: after 30s total`

### FFmpegErrorParser (nieuw)
Parse FFmpeg stderr naar actionable categorieën.

**Categories**:
- `OOM` — "Cannot allocate memory"
- `TIMEOUT` — process killed after timeout
- `CODEC` — "Decoder not found", "Unsupported codec"
- `IO` — "No such file", "Permission denied"
- `UNKNOWN` — fallback

### OutputQualityChecker (nieuw)
Verificeer AI-gegenereerde content.

**Checks**:
- Image: dimensions ≥ minimum, format is expected (PNG/JPEG)
- Video: resolution ≥ 720p, duration within expected range
- General: file size > 0, not truncated

---

## Provider Inventory

| Provider | Current State | Gap | Priority |
|----------|---------------|-----|----------|
| **Gemini** | No retry at service level | Add tenacity | P0 |
| **MiniMax** | Good retry, status polling | Add output quality check | P1 |
| **Runway** | Basic error handling | Add timeout, quality check | P1 |
| **Pika/fal.ai** | HTTP-level retry only | Add structured error handling | P2 |
| **FFmpeg** | subprocess.run, partial stderr | Parse errors, add timeout | P1 |
| **RVM** | Good cancellation support | Add input validation | P2 |
| **rembg** | Basic try/except | Add PIL validation | P1 |
| **PIL/Pillow** | Used throughout | No central validation | P0 |

---

## Dependencies

- **tenacity**: Al in requirements — retry decorator
- **Pillow**: Al in requirements — image validation
- **structlog**: Al in requirements — unified logging
- **src/generative/services/**: Integratiepunten voor hardening
- **src/files/**: FileAsset upload validation

## Out of Scope

- Frontend upload validation (apart concern)
- Database schema changes
- New admin interfaces
- Historical error log storage (gebruik existing logging)

---

## Acceptance Scenarios

### Scenario 1: Corrupt Image Rejected
**Given** een upload met corrupt PNG (valid header, broken data)
**When** ImageValidator.validate_format() wordt aangeroepen
**Then** ValidationError met message "Image data is corrupt"

### Scenario 2: Gemini Retry on Rate Limit
**Given** Gemini retourneert 429 Too Many Requests
**When** tenacity retry wrapper is active
**Then** wait 1s, retry, succeed op attempt 2, log retry_count=1

### Scenario 3: FFmpeg OOM Detected
**Given** FFmpeg stderr bevat "Cannot allocate memory"
**When** FFmpegErrorParser.parse() wordt aangeroepen
**Then** return FFmpegError(category=OOM, message="Onvoldoende geheugen")

### Scenario 4: Low Quality AI Output Warned
**Given** MiniMax retourneert 480x270 video
**When** OutputQualityChecker.check_video() wordt aangeroepen
**Then** log warning "Resolution below minimum", return DEGRADED status

### Scenario 5: Unified Log Format
**Given** een Gemini image generation request
**When** request completes (success of failure)
**Then** log bevat: job_id, provider="gemini", operation="generate_image", duration_ms, status

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
