# Content Generation Templates

> Last updated: 2026-03-12

## Overview

De `content_generation` app definieert **welke soorten content** TeamReel kan maken. Templates beschrijven het type (pre-match, lineup, etc.), de vereiste inputs, en AI-workflow configuratie. ContentItems zijn de concrete output-instanties.

---

## Data Model (3 models)

### ContentTemplate

Blueprint voor een content type.

| Veld | Type | Doel |
|------|------|------|
| `template_type` | choices | `pre_match`, `during_match`, `post_match`, `season`, `member`, `custom` |
| `template_subtype` | choices | 25+: `flyer`, `lineup`, `walkon`, `goal`, `end_score`, `profile_photo`, `team_poster`… |
| `sport` | FK → Sport | Sport-specifiek |
| `formation` | FK → Formation | Voor lineup templates |
| `input_requirements` | JSON | Schema: welke spelers, staff, assets, match data nodig |
| `template_settings` | JSON | AI-specifieke config |
| `ai_workflow_id` | CharField(200) | External pipeline ID |
| `credits_required` | PositiveInt | Default 1 credit per generatie |
| `timeout_minutes` | int | 1–1440, default 30 |
| `style_variant` | CharField(100) | "Modern", "Classic", "Neon" |
| `organisation` | FK → Organisation | NULL = global template (alle clubs) |
| `project` | FK → Project | Optioneel project-scope |

**Constraint:** unique `(organisation, name)`.

**Scoping:** Global templates (org=NULL) zijn zichtbaar voor iedereen, bewerkbaar door superusers. Org/project templates zijn org-scoped.

### ContentItem

Concrete output-instantie van een template.

| Veld | Type | Doel |
|------|------|------|
| `template` | FK → ContentTemplate | PROTECT |
| `project` | FK → Project | |
| `activity` | FK → Activity | Optioneel (match/event link) |
| `output_file` | FK → FileAsset | Ingevuld bij completion |
| `status` | choices | `queued → generating → completed/failed → approved/rejected/revision_requested` |
| `input_data` | JSON | User-provided inputs |
| `error_message` | text | Bij failure |
| `metadata` | JSON | duration, retries, progress_percent |
| `deleted_at` | datetime | Soft-delete |

**Validatie:** `output_file` verplicht bij completed, `error_message` verplicht bij failed.

### ContentApproval

Review record gekoppeld aan een ContentItem.

| Veld | Type | Doel |
|------|------|------|
| `content_item` | FK → ContentItem | |
| `reviewer` | FK → User | |
| `status` | choices | `pending`, `approved`, `rejected`, `revision_requested` |
| `feedback_text` | text | Verplicht bij reject/revision |

---

## Content Lifecycle

```
User kiest template + vult inputs in
  │
  ├── Duplicate detection: check of in-progress item bestaat voor template+activity
  │
  ▼
ContentItem aangemaakt (status=QUEUED)
  → Celery: generate_content_task
    → status=GENERATING
    → AI pipeline (via generative app)
    → ✅ Output → status=COMPLETED + FileAsset link
    → ❌ Error → status=FAILED + error_message
  │
  ├── Approve → status=APPROVED + ContentApproval record
  ├── Reject → status=REJECTED + ContentApproval (met feedback)
  ├── Revision → status=REVISION_REQUESTED
  └── Retry → re-queue failed/rejected items
```

---

## API Endpoints

### ContentTemplateViewSet

| Methode | Endpoint | Doel |
|---------|----------|------|
| CRUD | `/content/templates/` | Template beheer |

Filters: sport (incl. parent↔variant matching), org, project, type. Delete-bescherming: weigert als ContentItems bestaan. Paginatie: 100/page, max 500.

### ContentItemViewSet

| Methode | Endpoint | Doel |
|---------|----------|------|
| POST | `/content/items/` | Aanmaken + queue generatie |
| GET | `/content/items/{id}/status/` | Polling (progress_percent, estimated_completion) |
| POST | `/content/items/{id}/retry/` | Opnieuw proberen |
| POST | `/content/items/{id}/approve/` | Goedkeuren |
| POST | `/content/items/{id}/reject/` | Afwijzen (feedback verplicht) |
| POST | `/content/items/{id}/request-revision/` | Revisie aanvragen |
| GET | `/content/items/{id}/download/` | Redirect naar FileAsset URL |

Paginatie: 50/page, max 200.

---

## Relatie met andere apps

```
ContentTemplate
  │ definieert type + requirements
  ▼
ContentItem → generative app (AI generatie)
  │             └── credit_service (debit)
  ▼               └── file_storage (S3)
ContentApproval → notification_routing (B17 event)
  │
  └── workflow_engine (optioneel, voor formele approval flows)
```

---

## Gerelateerde docs

- [generative-pipeline.md](generative-pipeline.md) — AI generation pipeline
- [credits-transactions.md](credits-transactions.md) — Credits per template
- [workflow-engine.md](workflow-engine.md) — Approval state machine
- [../media/media-templates.md](../media/media-templates.md) — Visuele rendering pipeline (lineup flyers, match updates)
