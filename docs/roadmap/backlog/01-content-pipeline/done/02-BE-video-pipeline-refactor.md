# 356 — F36 — Video Pipeline Refactor: Shared Services

| | |
|---|---|
| Status | ✅ DONE |
| Type | Feature |
| Impact | 🟡 important |
| Effort | ~30 uur (Fase 1+2 done: ~16u, Fase 3: ~14u) |
| Bron | Code Review — media/video/image pipeline |

## Context

De video pipeline (`src/video/services/`) is organisch gegroeid van 1 lineup builder naar 7 content types. Elk type heeft een eigen builder, composer, en processor, maar ze delen ~60% gemeenschappelijke logica die steeds is gekopieerd in plaats van geëxtraheerd.

**Huidige staat:**
- 12.000+ regels in `src/video/services/`
- `lineup_builder.py` alleen al: 1.983 regels
- Brand resolution: 3× ~80 regels gekopieerd
- Match context: 3× ~60 regels gekopieerd
- Presigned URL helper: 3× gekopieerd
- Workflow transition: 5× gekopieerd in tasks
- MediaItem creation: leeft in lineup task maar is generiek
- 17 DEBUG-level logs op INFO in productie
- ~260 regels deprecated daemon-thread code

## Doel

Extractie van gemeenschappelijke logica naar herbruikbare modules, zodat:
1. Bugfixes op 1 plek worden gedaan (niet 3-5×)
2. Nieuwe content types sneller gebouwd worden
3. `lineup_builder.py` van 1.983 naar ~800 regels gaat
4. Productie-logs schoner worden

## Fases

### Fase 1: Quick Extractions (Q053-Q058) ✅
Individuele Q-items die onafhankelijk opgepakt kunnen worden:
- ✅ Q053: Brand resolution → shared module
- ✅ Q054: Workflow transition → shared task utils
- ✅ Q055: Match context → shared dataclass
- ✅ Q056: Deprecated threads verwijderen
- ✅ Q057: DEBUG logs opschonen
- ✅ Q058: MediaItem creation → shared task utils

### Fase 2: Pipeline Patterns (Q059-Q065) ✅
Processor patterns, task runner, constants, en shared utilities:
- ✅ Q059: Generic video task runner
- ✅ Q060: Processor template method (BaseVideoProcessor)
- ✅ Q061: Deduplicate media item creation
- ✅ Q062: BrandResolver in match_intro
- ✅ Q063: BrandResolver in ThenVsNow
- ✅ Q064: Centraliseer pipeline constants
- ✅ Q065: Shared image utilities

### Fase 3: Deep Consolidation (Q066-Q073) ✅
Diepere refactoring op basis van pipeline-brede code review:

**Header & Layout:**
- ✅ Q066: ThenVsNow header centraliseren
- ✅ Q070: Shared FormationLayout voor lineup flyer + video

**Constants & Styling:**
- ✅ Q067: Sponsor constants inconsistentie fixen
- ✅ Q068: FFmpeg path + utility wrappers opschonen (ronde 1)

**Performance & Patterns:**
- ✅ Q069: Header upload-download round-trip elimineren
- ✅ Q071: Composer shared helpers — `prepare_background()`, `prepare_sponsor()`, `probe_duration()`
- ✅ Q072: Legacy brand resolution — composers via `LineupData.brand_primary`

**Tests:**
- ✅ Q073: Unit tests formation_layout + common utils (66 tests)

### Fase 3b: Residual Cleanup (Q074-Q079)
Post-Q073 pipeline analyse onthulde resterende issues:

**Brand & Wrappers:**
- ✅ Q074: Lineup flyer BrandResolver migratie + resolve_brand_color verwijderen
- ✅ Q075: Thin wrappers opschonen ronde 2 + hardcoded canvas dimensies

**Sponsor & Frame:**
- ✅ Q076: Sponsor prep uniformering — alle 6 bestanden via `prepare_sponsor()`
- ✅ Q078: Shared lineup frame setup — bg + header + sponsor extractie

**Architecture:**
- ✅ Q077: Image cache centralisatie — `ImageCache` class i.p.v. module-level dicts
- ✅ Q079: Builders voor MatchIntro en ThenVsNow — typed dataclasses + builder pattern

### Fase 4: Builder Base Class (toekomst)
Na de quick items: evalueer of een `BaseContentBuilder` class zinvol is:
- Gemeenschappelijke `__init__` (activity_id, output_resolution)
- Template `_gather_data()` met hooks
- Shared asset resolution via brand_resolver
- Overweeg pas als er nieuwe content types bijkomen
- FFmpeg filter builder abstraction (grootste winst, meeste effort)

## Voortgang

| Fase | Items | Status |
|------|-------|--------|
| Fase 1 | Q053-Q058 | ✅ Alle 6 done |
| Fase 2 | Q059-Q065 | ✅ Alle 7 done |
| Fase 3 | Q066-Q073 | ✅ Alle 8 done |
| Fase 3b | Q074-Q079 | ✅ Alle 6 done |
| Fase 4 | — | Later |

## Niet in scope
- FFmpeg compositing logic (uniek per content type — wel filter helpers in Fase 4)
- Video specs (goed gestructureerd in `asset_processing_specs.py`)
- Celery task configuratie (goed afgesteld met retry/jitter)
- Processor architectuur (`processors/base.py` inheritance is clean)

## Review resultaten (april 2026)

10/12 architecturale doelen behaald:
- ✅ `BrandResolver` als single brand resolution patroon
- ✅ `resolve_match_context()` als shared dataclass
- ✅ `BaseVideoProcessor` template method (7 processors)
- ✅ `run_video_task()` als generic task runner (4 tasks)
- ✅ Pipeline constants centraal in `_common.py`
- ✅ `ImageCache` class + `FrameAssets`/`prepare_lineup_frame()` shared
- ✅ Thin wrappers verwijderd uit alle composers
- ✅ Deprecated daemon threads verwijderd (video_service.py: 244 regels)
- ✅ Typed builders voor alle 4 content types
- ⚠️ `lineup_builder.py`: 1.680 regels (doel was ~800, −15% vs −60% target)
- ⚠️ Netto regels niet gedaald (structuur toegevoegd, reductie minimaal)

Fase 4 (Builder Base Class) bewust uitgesteld — pas relevant bij nieuwe content types.
