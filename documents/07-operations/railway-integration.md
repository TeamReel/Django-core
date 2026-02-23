# Railway Integration Guide

**Last Updated:** 2026-02-23
**Status:** Live — 6 services + 2 managed datastores

---

## Overview

De Django Core-App draait op **Railway** als een multi-service architectuur. Elke service deelt dezelfde GitHub repo en Docker image, maar draait een ander process via het start command.

---

## Architectuur op Railway

```
┌──────────────────────────────────────────────────────────────────┐
│                        Railway Project                           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │   frontend   │  │   backend   │  │      celery-beat         │ │
│  │  (Vercel/    │  │  api.team-  │  │  Periodieke taken        │ │
│  │   Netlify)   │  │  reel.app   │  │  (cleanup, metrics)      │ │
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

## Services Overzicht

### 1. backend (Web Server)

| Eigenschap | Waarde |
|-----------|--------|
| **Type** | GitHub Repo (auto-deploy) |
| **Domein** | `api.teamreel.app` |
| **Start Command** | `python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 300` |
| **Publicly Exposed** | ✅ Ja |

### 2. celery-beat (Scheduler)

| Eigenschap | Waarde |
|-----------|--------|
| **Type** | GitHub Repo |
| **Start Command** | `celery -A config beat --loglevel=info` |
| **Publicly Exposed** | ❌ Nee |
| **Doel** | Periodieke taken (cleanup, metrics, cost updates) |

### 3. celery-worker (Fast/Default Queue)

| Eigenschap | Waarde |
|-----------|--------|
| **Type** | GitHub Repo |
| **Start Command** | `celery -A config worker --loglevel=info --concurrency=2 -Q default,video_fast -n worker-fast@%h` |
| **Queues** | `default`, `video_fast` |
| **Concurrency** | 2 (parallel) |
| **Taken** | Thumbnails, lineup processing, notificaties, lichte taken |

### 4. video-worker (Heavy Video Queue)

| Eigenschap | Waarde |
|-----------|--------|
| **Type** | GitHub Repo |
| **Start Command** | `celery -A config worker --loglevel=info --concurrency=1 -Q video_slow -n worker-video@%h` |
| **Queues** | `video_slow` |
| **Concurrency** | 1 (sequentieel — CPU/memory-intensief) |
| **Taken** | RVM background removal, transcoding, video compositie, then-vs-now compilatie |

### 5. worker-ai (AI Generation Queue)

| Eigenschap | Waarde |
|-----------|--------|
| **Type** | GitHub Repo |
| **Start Command** | `celery -A config worker --loglevel=info --concurrency=1 -Q ai_generation -n worker-ai@%h` |
| **Queues** | `ai_generation` |
| **Concurrency** | 1 (sequentieel — rate-limited) |
| **Taken** | Gemini/MiniMax/Veo API calls, AI asset generation |

### 6. frontend

| Eigenschap | Waarde |
|-----------|--------|
| **Type** | GitHub Repo (of Vercel/Netlify) |
| **Domein** | `demo.teamreel.app` |

### Managed Services

| Service | Type | Volumes |
|---------|------|---------|
| **Postgres** | Railway Managed | `postgres-volume` |
| **Redis** | Railway Managed | `redis-volume` |

---

## Nieuwe Worker Service Aanmaken (stap voor stap)

### Stap 1: Service aanmaken

1. Open Railway Dashboard → je project
2. Klik **+ Create** (rechtsboven)
3. Kies **GitHub Repo** → selecteer **TeamReel/Django-core**
4. Wacht tot de build klaar is (dezelfde Dockerfile als backend)

### Stap 2: Start Command instellen

1. Klik op de nieuwe service → **Settings**
2. Bij **Service Name**: vul de naam in (bijv. `video-worker`)
3. Bij **Start Command**: plak het juiste commando (zie tabel hierboven)
4. **Root Directory**: leeg laten
5. **Networking**: geen public domain nodig (workers zijn niet exposed)

### Stap 3: Environment Variables

Elke worker heeft dezelfde env vars nodig als `celery-worker`. Snelste methode:

1. Ga naar `celery-worker` → **Variables** → **RAW Editor**
2. Kopieer alle variabelen
3. Ga naar de nieuwe service → **Variables** → **RAW Editor**
4. Plak alles

**Minimaal vereiste variabelen:**

| Variabele | Bron | Verplicht |
|-----------|------|-----------|
| `DATABASE_URL` | Reference → Postgres | ✅ |
| `REDIS_URL` | Reference → Redis | ✅ |
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | ✅ |
| `SECRET_KEY` | Zelfde als backend | ✅ |
| `AWS_ACCESS_KEY_ID` | S3 credentials | ✅ (voor video) |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials | ✅ (voor video) |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket | ✅ (voor video) |
| `AWS_S3_REGION_NAME` | S3 regio | ✅ (voor video) |
| `GEMINI_API_KEY` | Google AI | ✅ (voor worker-ai) |
| `MINIMAX_API_KEY` | MiniMax | ⬚ (voor worker-ai) |
| `SENTRY_DSN` | Sentry | ⬚ Optioneel |

> **Tip:** Gebruik Railway **Variable References** voor `DATABASE_URL` en `REDIS_URL` — deze verwijzen automatisch naar de juiste interne URL.

### Stap 4: Deploy

Klik **Deploy** of push naar GitHub. Railway bouwt de image en start het process.

---

## Queue Architectuur

### Waarom 3 aparte workers?

Met 1 worker (concurrency=2) blokkeerden taken elkaar:

```
❌ VOORHEEN: 1 worker, concurrency=2
   2× RVM jobs (elk 1 uur) → BLOKKEERT alle thumbnails, lineup, AI

✅ NU: 3 workers, gescheiden queues
   RVM job draait op video-worker    → blokkeert NIETS anders
   Thumbnail draait op celery-worker → instant, geen wachtrij
   AI job draait op worker-ai        → eigen tempo, rate-limited
```

### Task → Queue Routing

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

### Taken die NIET via Celery gaan

De volgende job types worden als **background threads** op de web server gedraaid (via `video_service.py`):

| Job Type | Reden |
|----------|-------|
| `lineup` (compositie) | Directe FFmpeg compositie op webserver |
| `goal_celebration` | Directe FFmpeg compositie op webserver |
| `match_intro` | Directe FFmpeg compositie op webserver |
| `then_vs_now` (compositie) | Directe FFmpeg compositie op webserver |

> **Let op:** Dit zijn de *compositie*-stappen. De *voorbereidende* stappen (RVM processing, transcoding) gaan wél via Celery.

---

## Configuration Files

### `railway.json`

Vertelt Railway om **Nixpacks** te gebruiken:

```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": { "numReplicas": 1, "restartPolicyType": "ON_FAILURE" }
}
```

### `Procfile`

Definieert alle process types. Railway draait automatisch het `web` process. Andere processen vereisen handmatige service-aanmaak.

```
web:          gunicorn ...              (auto-deployed)
beat:         celery beat               (handmatige service)
worker:       celery worker -Q default,video_fast
worker-video: celery worker -Q video_slow
worker-ai:    celery worker -Q ai_generation
```

### Environment Variables

Railway levert automatisch:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `PORT` — Port voor de webserver

**Handmatig instellen:**
- `SECRET_KEY` — Django secret key
- `DJANGO_SETTINGS_MODULE` = `config.settings.production`
- `ALLOWED_HOSTS` — Railway domein
- `CSRF_TRUSTED_ORIGINS` — `https://api.teamreel.app`
- S3 credentials (AWS_*)
- API keys (Gemini, MiniMax, etc.)

---

## Deployment Workflow

1. **Push naar GitHub** — code naar `main` branch
2. **Railway Trigger** — Railway detecteert de push en start builds
3. **Build Phase** — Nixpacks bouwt de Docker image (1× gedeeld)
4. **Deploy Phase** — Elke service start met zijn eigen start command
5. **Health Checks** — Railway monitort `/health/live` voor de web service

> Alle 6 services (backend, beat, 3 workers, frontend) rebuilden bij elke push. Workers hebben geen health check endpoint nodig — Railway monitort of het process draait.

---

## Database Access

Railway biedt een **Public TCP Proxy** voor lokale script-toegang:

```bash
postgresql://postgres:<password>@switchback.proxy.rlwy.net:17304/railway
```

---

## Logs & Monitoring

- **Logs:** Railway Dashboard → service → Deployments tab
- **Metrics:** Railway biedt CPU/Memory grafieken per service
- **Worker monitoring:** Check of queues leegdraaien via Redis:
  ```bash
  redis-cli -u $REDIS_URL LLEN default
  redis-cli -u $REDIS_URL LLEN video_slow
  redis-cli -u $REDIS_URL LLEN ai_generation
  ```

---

## Troubleshooting

### Worker is "Service is offline"
- **Oorzaak:** Geen deployment gemaakt, of start command ontbreekt.
- **Fix:** Check Settings → Start Command. Klik "Make a deployment to get started".

### "502 Bad Gateway"
- **Oorzaak:** Web process bindt niet aan `$PORT`.
- **Fix:** Gunicorn command moet `--bind 0.0.0.0:$PORT` bevatten.

### Jobs blijven in "queued"
- **Oorzaak:** Worker consumeert die queue niet.
- **Fix:** Check of de juiste worker de queue consumeert (zie tabel hierboven).
- **Diagnose:** `redis-cli LLEN <queue_name>` — als dit oploopt, draait er geen consumer.

### "Database connection failed"
- **Oorzaak:** `DATABASE_URL` niet gezet.
- **Fix:** Voeg Variable Reference toe naar Postgres.

### Worker start, maar pakt geen taken op
- **Oorzaak:** `DJANGO_SETTINGS_MODULE` staat op `local` i.p.v. `production` → worker gebruikt SQLite/memory broker.
- **Fix:** Stel `DJANGO_SETTINGS_MODULE=config.settings.production` in als env var.

---

## Kosten & Schaalbaarheid

| Service | Geschat verbruik | Schaaltip |
|---------|-----------------|-----------|
| backend | Laag-gemiddeld | Verhoog `--workers` in Gunicorn |
| celery-worker | Laag | Verhoog `--concurrency` als nodig |
| video-worker | Hoog (CPU/RAM) | Houd `--concurrency=1`, schaal horizontaal met replicas |
| worker-ai | Laag (wacht op API) | `--concurrency=1` is voldoende |
| celery-beat | Minimaal | 1 replica, nooit opschalen |

> **Horizontaal schalen** (meerdere replicas) vereist Railway Pro plan. Stel `numReplicas` in via `railway.json` of het Dashboard.
