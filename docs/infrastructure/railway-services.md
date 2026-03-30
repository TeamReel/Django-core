# Railway Services — TeamReel Productie

**Last Updated:** 2026-03-12
**Status:** Live — 6 services + 2 managed datastores

> **Note:** 4 Celery queues (`default`, `video_fast`, `video_slow`, `ai_generation`) verdeeld over 3 workers. `docker-compose.prod.yml` definieert slechts 1 celery worker — de 3-worker splitsing is Railway-specifiek (Procfile-based).

---

## Architectuur

```
┌──────────────────────────────────────────────────────────────────┐
│                        Railway Project                           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │   frontend   │  │   backend   │  │      celery-beat         │ │
│  │  demo.team-  │  │  api.team-  │  │  Periodieke taken        │ │
│  │  reel.app    │  │  reel.app   │  │  (cleanup, metrics)      │ │
│  │   Online ●   │  │  Online ●   │  │  Online ●                │ │
│  └─────────────┘  └──────┬──────┘  └────────────┬─────────────┘ │
│                          │                       │               │
│              ┌───────────┼───────────────────────┘               │
│              ▼           ▼                                       │
│  ┌──────────────┐  ┌──────────┐                                 │
│  │   Postgres    │  │  Redis   │ ◄── Broker + Result Backend    │
│  │   Online ●    │  │ Online ● │                                │
│  └──────────────┘  └────┬─────┘                                 │
│                          │                                       │
│         ┌────────────────┼────────────────┐                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │celery-worker│  │video-worker │  │  worker-ai  │             │
│  │ default +   │  │ video_slow  │  │ai_generation│             │
│  │ video_fast  │  │ c=1         │  │ c=1         │             │
│  │ c=2         │  │             │  │ rate-limited│             │
│  │ Online ●    │  │ Online ●    │  │ Online ●    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Services

### 1. backend (Web Server)

| Eigenschap | Waarde |
|-----------|--------|
| **Domein** | `api.teamreel.app` |
| **Start Command** | `python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 300` |
| **Publicly Exposed** | Ja |
| **Auto-deploy** | Ja (GitHub push → main) |

### 2. celery-beat (Scheduler)

| Eigenschap | Waarde |
|-----------|--------|
| **Start Command** | `celery -A config beat --loglevel=info` |
| **Doel** | Periodieke taken: cleanup notificaties, cleanup files, metrics, template costs |
| **Publicly Exposed** | Nee |

### 3. celery-worker (Fast/Default Queue)

| Eigenschap | Waarde |
|-----------|--------|
| **Start Command** | `celery -A config worker --loglevel=info --concurrency=2 -Q default,video_fast -n worker-fast@%h` |
| **Queues** | `default`, `video_fast` |
| **Concurrency** | 2 |
| **Taken** | Thumbnails, lineup processing, notificaties, lichte taken |

### 4. video-worker (Heavy Video Queue)

| Eigenschap | Waarde |
|-----------|--------|
| **Start Command** | `celery -A config worker --loglevel=info --concurrency=1 -Q video_slow -n worker-video@%h` |
| **Queues** | `video_slow` |
| **Concurrency** | 1 (CPU/memory-intensief) |
| **Taken** | RVM background removal, transcoding, video compositie, then-vs-now compilatie |

### 5. worker-ai (AI Generation Queue)

| Eigenschap | Waarde |
|-----------|--------|
| **Start Command** | `celery -A config worker --loglevel=info --concurrency=1 -Q ai_generation -n worker-ai@%h` |
| **Queues** | `ai_generation` |
| **Concurrency** | 1 (rate-limited) |
| **Taken** | Gemini/MiniMax/Veo API calls, AI asset generation |

### 6. frontend

| Eigenschap | Waarde |
|-----------|--------|
| **Domein** | `demo.teamreel.app` |
| **Deployed via** | GitHub Repo (Vercel/Netlify of Railway) |

### Managed Services

| Service | Volumes |
|---------|---------|
| **Postgres** | `postgres-volume` |
| **Redis** | `redis-volume` |

---

## Nieuwe Worker Aanmaken (stap voor stap)

### Stap 1 — Service aanmaken

1. Railway Dashboard → je project → **+ Create** (rechtsboven)
2. Kies **GitHub Repo** → selecteer **TeamReel/Django-core**
3. Railway bouwt de Docker image (zelfde als backend)

### Stap 2 — Start Command instellen

1. Klik op de nieuwe service → **Settings**
2. **Service Name**: vul de naam in (bijv. `video-worker`)
3. **Start Command**: plak het juiste commando (zie tabel hierboven)
4. **Root Directory**: leeg laten
5. **Networking**: geen public domain nodig (workers zijn niet exposed)

### Stap 3 — Environment Variables

Snelste methode: kopieer vars van `celery-worker`.

1. Ga naar `celery-worker` → **Variables** → **RAW Editor** → kopieer alles
2. Ga naar de nieuwe service → **Variables** → **RAW Editor** → plak

**Minimaal vereiste variabelen:**

| Variabele | Bron | Verplicht |
|-----------|------|-----------|
| `DATABASE_URL` | Reference → Postgres | Altijd |
| `REDIS_URL` | Reference → Redis | Altijd |
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | Altijd |
| `SECRET_KEY` | Zelfde als backend | Altijd |
| `AWS_ACCESS_KEY_ID` | S3 credentials | Video workers |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials | Video workers |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket | Video workers |
| `AWS_S3_REGION_NAME` | S3 regio | Video workers |
| `GEMINI_API_KEY` | Google AI | worker-ai |
| `MINIMAX_API_KEY` | MiniMax | worker-ai (optioneel) |
| `SENTRY_DSN` | Sentry | Optioneel |

> **Tip:** Gebruik Railway **Variable References** voor `DATABASE_URL` en `REDIS_URL`.

### Stap 4 — Deploy

Klik **Deploy** of push naar GitHub. Railway bouwt de image en start het process.

---

## Queue Architectuur

### Waarom 3 aparte workers?

```
VOORHEEN: 1 worker, concurrency=2
   2× RVM jobs (elk 1 uur) → BLOKKEERT alle thumbnails, lineup, AI

NU: 3 workers, gescheiden queues
   RVM job draait op video-worker    → blokkeert NIETS anders
   Thumbnail draait op celery-worker → instant, geen wachtrij
   AI job draait op worker-ai        → eigen tempo, rate-limited
```

### Task → Queue → Worker

Gedefinieerd in `src/config/settings/celery.py`:

| Celery Task | Queue | Worker |
|-------------|-------|--------|
| `generate_thumbnail` | `video_fast` | celery-worker |
| `process_lineup_video` | `default` | celery-worker |
| `transcode_video` | `video_slow` | video-worker |
| `compose_video` | `video_slow` | video-worker |
| `process_member_asset` (RVM) | `video_slow` | video-worker |
| `process_then_vs_now_video` | `video_slow` | video-worker |
| `generate_asset_task` (AI) | `ai_generation` | worker-ai |

### Taken via background threads (NIET Celery)

Deze job types worden als threads op de **webserver** gedraaid (via `video_service.py`):

| Job Type | Reden |
|----------|-------|
| `lineup` (compositie) | Directe FFmpeg compositie |
| `goal_celebration` | Directe FFmpeg compositie |
| `match_intro` | Directe FFmpeg compositie |
| `then_vs_now` (compositie) | Directe FFmpeg compositie |

> **Let op:** De *voorbereidende* stappen (RVM processing, transcoding) gaan wél via Celery. Alleen de uiteindelijke FFmpeg compositie draait als thread.

---

## Deployment Flow

```
git push origin main
        │
        ▼
  Railway detecteert push
        │
        ├── Build: Docker image (1× gedeeld)
        │
        ├── backend:      gunicorn + migrate
        ├── celery-beat:   celery beat
        ├── celery-worker: celery -Q default,video_fast
        ├── video-worker:  celery -Q video_slow
        └── worker-ai:     celery -Q ai_generation
```

Alle services rebuilden automatisch bij elke push naar `main`.

---

## Troubleshooting

### Worker "Service is offline"
**Oorzaak:** Geen deployment gemaakt, of start command ontbreekt.
**Fix:** Settings → Start Command instellen. Klik "Make a deployment to get started".

### Jobs blijven in "queued"
**Oorzaak:** Worker consumeert die queue niet.
**Fix:** Check of de juiste worker de queue consumeert (zie tabel).
**Diagnose:** `redis-cli LLEN <queue_name>` — als dit oploopt, geen consumer actief.

### Worker start, maar pakt geen taken op
**Oorzaak:** `DJANGO_SETTINGS_MODULE` staat op `local` → worker gebruikt SQLite/memory broker.
**Fix:** Stel `DJANGO_SETTINGS_MODULE=config.settings.production` in als env var.

### "502 Bad Gateway" op backend
**Oorzaak:** Gunicorn bindt niet aan `$PORT`.
**Fix:** Check dat start command `--bind 0.0.0.0:$PORT` bevat.

### "Database connection failed"
**Oorzaak:** `DATABASE_URL` niet gezet.
**Fix:** Voeg Variable Reference toe naar Postgres.

---

## Kosten & Schaalbaarheid

| Service | Verbruik | Schaaltip |
|---------|----------|-----------|
| backend | Laag-gemiddeld | Verhoog `--workers` in Gunicorn |
| celery-worker | Laag | Verhoog `--concurrency` |
| video-worker | Hoog (CPU/RAM) | Houd `c=1`, schaal met replicas |
| worker-ai | Laag (wacht op API) | `c=1` is voldoende |
| celery-beat | Minimaal | 1 replica, nooit opschalen |

> Horizontaal schalen (meerdere replicas) vereist Railway Pro plan.

---

## Gerelateerde documentatie

- [Video Processing Pipeline](../media/rvm-alpha-pipeline.md) — RVM, MOV alpha, MP4 preview
- [AI Generation Queue](../features/generation-queue.md) — GenerationJob lifecycle
- [Media Architecture](../media/media-architecture.md) — 4-laags media opslag

