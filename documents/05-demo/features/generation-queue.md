# AI Generation Queue — Hoe werkt het in de praktijk?

**Module:** B34 Generative Pipelines
**Feature:** GenerationJob Queue & Workflow Tab
**Status:** Live (commit `26315b0e`, migratie `0005_generation_job`)
**Datum:** 2026-02-20

---

## Overzicht

Elke AI-generatie (video, afbeelding, flyer) wordt voortaan als een **GenerationJob** opgeslagen in de database. De gebruiker ziet in de Approvals-pagina een **AI Queue** tab met realtime status, voortgangsbalken en meldingen zodra een job klaar of mislukt is.

---

## Architectuur op één oogopslag

```
Gebruiker triggert generatie (bijv. lineup video)
        │
        ▼
POST /api/v1/generative/assets/generate/
  ├─ Maakt Redis task-entry aan (ephemeer, 30 min TTL)
  ├─ Maakt GenerationJob DB-record aan (persistent)
  └─ Start Celery taak (async)
        │
        ▼
Celery: generate_asset_task
  ├─ Verwerkt video/afbeelding
  ├─ Schrijft voortgang naar Redis
  └─ Roept _sync_job_status() aan bij afronding
        │
        ├─ completed → GenerationJob.status = "completed"
        └─ failed    → GenerationJob.status = "failed"

Frontend (ApprovalsPage / AI Queue tab)
  └─ useGenerationJobs hook pollt elke 5–8 seconden
     GET /api/v1/generative/jobs/
       ├─ Geeft DB-records terug
       ├─ Verrijkt actieve jobs met live Redis-voortgang
       └─ Detecteert statuswisselingen → toast + browser push
```

---

## Stap-voor-stap gebruikersverhaal

### 1. Generatie starten

De gebruiker klikt op "Genereer lineup video" (of een ander AI-type). De API antwoordt meteen:

```json
{
  "task_id": "a3f7c...",
  "status": "queued",
  "message": "Job is aangemaakt en staat in de wachtrij"
}
```

Tegelijk verschijnt een **toast** rechtsonder:
`🤖 AI job gestart — volg de voortgang in de AI Queue`

---

### 2. Voortgang volgen

De gebruiker opent `/approvals` → tab **AI Queue**.

Elke job wordt getoond als een kaart:

```
┌─────────────────────────────────────────────────────────┐
│ 🔄  Ajax Lineup — 4-3-3              [processing]        │
│     video · 20 feb 2026 14:32                            │
│     ████████░░░░░░░░░░░░░░░░ 38%                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ✅  Speler foto — Bruno Fernandes     [completed]        │
│     image · 20 feb 2026 14:28                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ❌  Club banner generatie             [failed]           │
│     image · 20 feb 2026 14:20                            │
│     Provider timeout after 30s                           │
└─────────────────────────────────────────────────────────┘
```

De hook pollt **elke 5 seconden** wanneer de AI Queue tab open is, anders **elke 8 seconden**.

---

### 3. Melding bij statuswijziging

Zodra een job van `processing` → `completed` of `failed` springt, ontvangt de gebruiker:

1. **Toast in de app** (rechtsonder, groen/rood, 5 seconden)
2. **Browser push notificatie** (ook als de tab op de achtergrond staat, mits toestemming verleend)

De browser push-toestemming wordt de eerste keer dat de gebruiker de AI Queue tab opent opgevraagd.

---

## Backend: GenerationJob model

**Tabel:** `generative_job`
**Migratie:** `src/generative/migrations/0005_generation_job.py`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `task_id` | UUID (unique) | Koppelt DB-record aan Redis cache entry |
| `template_id` | CharField | Welk template gebruikt is (bijv. `lineup_video_v2`) |
| `label` | CharField | Leesbare naam (bijv. "Ajax 4-3-3 lineup") |
| `output_type` | CharField | `image` of `video` |
| `output_asset_type` | CharField | Subtype (bijv. `lineup_flyer`, `player_headshot`) |
| `project_id` | CharField | B07 project-scoping |
| `membership_id` | CharField | Voor speler-specifieke jobs |
| `created_by_id` | IntegerField | User die de job heeft aangemaakt |
| `status` | CharField | Zie statussen hieronder |
| `progress` | PositiveSmallIntegerField | 0–100 (%) |
| `error_message` | TextField | Foutmelding bij `failed` |
| `created_at` | DateTimeField | Aanmaaktijd |
| `updated_at` | DateTimeField | Laatste wijziging |
| `completed_at` | DateTimeField | Tijdstip van voltooiing |
| `approval_status` | CharField | `pending_review` / `approved` / `rejected` |
| `reviewed_by_id` | IntegerField | User die de review heeft uitgevoerd |
| `reviewed_at` | DateTimeField | Tijdstip van review |
| `output_url` | URLField | Persisted output URL |
| `output_variants` | JSONField | Alle output-varianten (resoluties, formats) |

### Statussen

| Status | Betekenis |
|--------|----------|
| `queued` | Aangemaakt, Celery-taak nog niet gestart |
| `waiting` | Wacht op semaphore (parallellimiet bereikt) |
| `processing` | Celery verwerkt actief |
| `retrying` | Automatische retry na tijdelijke fout |
| `completed` | Succesvol afgerond |
| `failed` | Fout opgetreden |
| `cancelled` | Door gebruiker geannuleerd |

---

## Backend: API endpoint

```
GET /api/v1/generative/jobs/
```

**Parameters:**

| Parameter | Omschrijving | Voorbeeld |
|-----------|-------------|---------|
| `status` | Filter op status (kommagescheiden) | `processing,queued` |
| `project_id` | Filter op project | `proj_ajax` |
| `limit` | Max aantal resultaten (standaard 50) | `100` |

**Response:**

```json
{
  "count": 3,
  "results": [
    {
      "task_id": "a3f7c...",
      "template_id": "lineup_video_v2",
      "label": "Ajax 4-3-3 lineup",
      "output_type": "video",
      "output_asset_type": "lineup_video",
      "status": "processing",
      "progress": 38,
      "message": "Rendering frame 19/50",
      "error_message": "",
      "created_at": "2026-02-20T14:32:00Z",
      "updated_at": "2026-02-20T14:32:45Z",
      "completed_at": null
    }
  ]
}
```

Actieve jobs (status `processing`, `queued`, `waiting`) worden **verrijkt** met realtime voortgang uit de Redis cache. Zo is de `progress` altijd up-to-date zonder extra DB-writes.

---

## Frontend: useGenerationJobs hook

**Bestand:** `demo/src/hooks/useGenerationJobs.ts`

```typescript
const { jobs, loading, error, refresh } = useGenerationJobs({
  pollInterval: 5000,          // ms, 0 = geen polling
  project_id: 'proj_ajax',     // optioneel filter
  onStatusChange: (job, prevStatus) => {
    // Wordt aangeroepen bij completed of failed
    // → toast tonen
    // → browser Notification sturen
  },
});
```

**Exports:**
- `useGenerationJobs(options)` — volledige lijst + status-callbacks
- `useGenerationJobsBadge()` — lichtgewicht, pollt elke 10s, geeft `activeCount` terug (voor sidebar badge)

---

## Frontend: ApprovalsPage integratie

**Bestand:** `demo/src/pages/ApprovalsPage.tsx`

De AI Queue is een extra tab naast de bestaande workflow-tabs:

```
📋 All (12) | 👀 Needs Review (3) | 🔄 In Progress (5) | ✅ Approved | ❌ Rejected | 🤖 AI Queue (2)
```

Wanneer `filter === 'ai_queue'`:
- Toont de lijst van `GenerationJob`-records
- Actieve jobs tonen een voortgangsbalk
- Mislukte jobs tonen de foutmelding in rood
- Lege state: "Geen AI jobs — jobs verschijnen hier zodra ze worden aangemaakt"

---

## Waar worden jobs aangemaakt?

In `src/generative/views_asset.py` roept `_create_generation_job()` aan op twee punten:

1. **Video-dispatch pad** — na het aanmaken van de Redis task, vóór het starten van Celery
2. **Image-dispatch pad** — idem

De helper faalt *stil* (geen exception propagatie), zodat een DB-probleem de generatie nooit blokkeert.

### Wanneer wordt de status gesynchroniseerd?

In `src/generative/tasks_asset.py` roept `_sync_job_status()` aan bij:

| Situatie | Nieuwe status |
|----------|--------------|
| Semaphore timeout (5 min) | `failed` |
| Onverwachte exception | `failed` |
| `_process_images` voltooid | `completed` (progress=100) |
| `_process_video` mislukt | `failed` |
| `_process_video` voltooid | `completed` (progress=100) |

---

## Verschil met de Redis cache

| | Redis cache | GenerationJob (DB) |
|--|------------|-------------------|
| **Levensduur** | 30 minuten (TTL) | Permanent |
| **Kan gefilterd worden** | Nee (geen lijst-API) | Ja (status, project, user) |
| **Voortgang (realtime)** | Ja (schrijft elke frame) | Nee (enkel start/eind) |
| **Historisch overzicht** | Nee | Ja |
| **Gebruik** | Polling tijdens actieve job | Workflow-tab, history, admin |

In de praktijk combineert de `GET /jobs/` API beide: DB-records als fundering, Redis als live voortgangsbron voor actieve jobs.

---

## Railway: migratie toepassen

De migratie is al uitgevoerd (bevestigd via PowerShell terminal, 20 feb 2026):

```bash
python manage.py migrate generative
# → Running migrations: Applying generative.0005_generation_job... OK
```

Tabel `generative_job` is aanwezig in productie.

---

## Bekende beperkingen (80/20)

1. **Geen annulering via UI** — de `cancelled` status bestaat, maar er is nog geen annuleerknop in de frontend.
2. **Geen automatische opruiming** — oude jobs worden niet automatisch verwijderd. Dit kan later via een dagelijkse cron worden toegevoegd (vergelijkbaar met de `retention_days` logica in GenerationRequest).
3. **Geen re-run knop** — mislukte jobs kunnen niet direct opnieuw worden gestart via de UI.
4. **Geen per-project filtering in de UI** — de hook ondersteunt `project_id` als parameter, maar de ApprovalsPage toont momenteel alle jobs van de ingelogde gebruiker.

---

## Gerelateerde docs

- [generative-pipeline.md](generative-pipeline.md) — Volledige generative engine (executors, provider cascade, asset pipeline)
- [credits-transactions.md](credits-transactions.md) — Credit reserve/settle bij generatie
- [video-processing.md](video-processing.md) — Video pipeline (downstream van generatie)
