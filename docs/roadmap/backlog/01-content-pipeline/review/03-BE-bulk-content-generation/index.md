````markdown
# B67: Bulk Content Generation

**Priority:** 🔥 Bouwen
**Phase:** 16
**Status:** � REVIEW
**Module ID:** 318
**Category:** Backend (TeamReel Product Feature)

## Description

## 318. B67 – Bulk Content Generation

**Doel**: Meerdere content items tegelijk genereren — bijv. alle wedstrijden van een speelronde, of een heel seizoen aan line-up graphics in één keer.

**Waarom TeamReel**: Clubs hebben vaak meerdere teams met wedstrijden op dezelfde dag. In plaats van 1-voor-1 content genereren, wil je "genereer voor alle wedstrijden dit weekend" kunnen doen.

**Wat moet er gebeuren**:

### BulkGenerationJob Model
- **BulkGenerationJob model**:
  - Fields: project FK, created_by (User FK), status (queued/processing/completed/failed)
  - Metadata: template_id, content_type (video/flyer/lineup/social)
  - Stats: total_items, completed_items, failed_items
  - Timestamps: created_at, started_at, completed_at

### BulkGenerationItem Model
- **BulkGenerationItem model**:
  - Fields: bulk_job FK, activity FK (wedstrijd), generative_request FK (created)
  - Status: pending/generating/completed/failed
  - Error: error_message (text, nullable)

### Workflow
1. User selecteert meerdere activities (wedstrijden) + template
2. BulkGenerationJob aangemaakt
3. Celery task splitst job in individuele GenerativeRequests
4. Elke request wordt parallel verwerkt (max concurrency per org)
5. Voortgang real-time zichtbaar (B64)
6. Bij completion → notificatie + optioneel approval flow (B66)

### Rate Limiting
- Max concurrent generations per organisation
- Fair queuing: geen enkele org kan alle workers claimen
- Priority queue: betaalde orgs krijgen voorrang (toekomstig)

### Integration
- Generative pipeline (bestaand)
- B15 (Celery async)
- B64 (realtime voortgang)
- B66 (approval na bulk generation)
- B17 (notifications bij completion)

**Scope**: 🔧 **Backend Only** (Django app + REST API + Celery tasks + tests + README)

**API Endpoints**:
- `POST /api/v1/bulk-generate/` — Start bulk generation job
- `GET /api/v1/bulk-generate/{id}/` — Job status + voortgang
- `GET /api/v1/bulk-generate/{id}/items/` — Individuele items + status
- `POST /api/v1/bulk-generate/{id}/cancel/` — Job annuleren
- `POST /api/v1/bulk-generate/{id}/retry-failed/` — Gefaalde items opnieuw

**Status**: � REVIEW

## Notes
- Nieuw module, toegevoegd op verzoek
- Belangrijk voor efficiency bij clubs met meerdere teams

---

## Delivery Checklist

- [x] **Migrations**: 0001_initial.py created (not yet applied to Railway)
- [x] **Seed Data**: Factories in `src/bulk_generation/tests/factories.py`
- [x] **Admin**: BulkGenerationJobAdmin + BulkGenerationItemInline registered
- [x] **API**: 5 endpoints tested (45 tests passing)
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
````
