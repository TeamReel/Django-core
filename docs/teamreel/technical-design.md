# TeamReel Technical Design

> Technische architectuur van TeamReel — gebouwd op het 80/20 Core Platform.

---

## 1. Architectuur

TeamReel draait als multi-service architectuur op Railway:

```
┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│  frontend   │  │   backend   │  │  celery-beat  │
│ demo.team-  │  │ api.team-   │  │  periodieke   │
│ reel.app    │  │ reel.app    │  │  taken        │
└─────────────┘  └──────┬──────┘  └──────┬───────┘
                        │                │
            ┌───────────┼────────────────┘
            ▼           ▼
     ┌──────────┐  ┌──────────┐
     │ Postgres │  │  Redis   │
     └──────────┘  └────┬─────┘
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│celery-worker│  │video-worker │  │  worker-ai  │
│ default +   │  │ video_slow  │  │ai_generation│
│ video_fast  │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 2. Tech Stack

| Laag | Technologie |
|------|------------|
| **Backend** | Django 5 + Django REST Framework |
| **Frontend** | React 18 + TypeScript (strict) + Vite |
| **Database** | PostgreSQL (Railway managed) |
| **Cache/Broker** | Redis (Celery broker + result backend) |
| **Storage** | AWS S3 |
| **Video** | FFmpeg (line-ups, composities, transcoding) |
| **AI** | Google Gemini, MiniMax (video), OpenAI |
| **Background** | Celery (4 queues, 3 workers) |
| **Deploy** | Railway (backend + workers) · Vercel (frontend) |

---

## 3. TeamReel-specifieke Apps

Deze Django apps vormen de 20% die TeamReel toevoegt bovenop het core platform:

| App | Models | Functie |
|-----|--------|---------|
| **activities** | 5 | Wedstrijden, trainingen, events + participaties |
| **activity_feed** | 3 | Timeline van activiteiten per team |
| **branding** | 4 | BrandProfile, BrandAsset — clubidentiteit tokens |
| **content_generation** | 8 | ContentTemplate, ContentField, GenerationRequest |
| **sport_configuration** | 5 | Sport types, posities, formaties |
| **generative** | 12 | AI providers, prompts, generation jobs, results |
| **video** | 11 | VideoJob, VideoPreset, overlays, FFmpeg pipeline |
| **medialib** | 7 | MediaItem, MediaCollection — semantische media laag |
| **workflows** | 4 | State machine, approval flows, transitions |

**Totaal TeamReel:** ~59 models, 59 migrations

---

## 4. Core Platform Apps (de 80%)

| App | Models | Functie |
|-----|--------|---------|
| **accounts** | 2 | User model, authenticatie, JWT |
| **organisations** | 2 | Multi-tenant root, Membership |
| **projects** | 13 | Project hiërarchie, ProjectMembership, Members |
| **permissions** | 4 | RBAC: Role, RoleAssignment, Permission registry |
| **audit** | 1 | Audit log voor alle wijzigingen |
| **files** | 1 | FileAsset — S3 opslag met metadata |
| **notifications** | 6 | Multi-channel notificatiesysteem |
| **contextual_notifications** | 5 | Context-aware notificaties |
| **settings** | 4 | UserPreference, OrganisationSettings |
| **transactions** | 6 | Transactie log, usage events |
| **credits** | 3 | Credit balance, packages, top-ups |
| **search** | 1 | Full-text search via PostgreSQL |
| **navigation** | 3 | Sidebar, breadcrumbs, recents/favorites |
| **trash** | 1 | Soft delete met herstel |
| **observability** | 1 | Health metrics, monitoring |

**Totaal Core:** ~53 models

---

## 5. AI & Video Pipeline

### Content Generatie Flow
```
Template selectie → Data invullen → GenerationRequest → AI Provider
    → GenerationResult → Review/Feedback → VideoJob → Export
```

### Video Compositie Types
| Type | Beschrijving | Queue |
|------|-------------|-------|
| **line-up** | Opstelling visualisatie | Thread (direct) |
| **match_intro** | Pre-match video | Thread (direct) |
| **goal_celebration** | Doelpunt viering | Thread (direct) |
| **then_vs_now** | Speler ontwikkeling video | Thread + Celery |
| **RVM processing** | Achtergrond verwijderen | `video_slow` queue |
| **Transcoding** | Format conversie | `video_slow` queue |
| **AI generatie** | Gemini/MiniMax API calls | `ai_generation` queue |

### AI Providers
| Provider | Gebruik | Rate |
|----------|---------|------|
| **Google Gemini** | Tekst + beeld generatie | Rate-limited |
| **MiniMax** | Video generatie | Rate-limited |
| **OpenAI** | Fallback tekst generatie | On-demand |

---

## 6. Frontend Architectuur

### Pagina's (43 routes)
De React app heeft 43 actieve routes waarvan de belangrijkste:
- **Dashboard** — overzicht met widgets
- **Team Hub** — hiërarchische navigatie (fed → club → team → seizoen → wedstrijd)
- **AI Studio** — generatie starten, preview, feedback
- **Mediabibliotheek** — alle content doorzoeken en filteren
- **Settings** — brand, leden, rechten, notificaties

### Design System
- CSS Modules (geen Tailwind)
- Design tokens in `demo/src/styles/tokens.css`
- System font stack (geen custom fonts)
- 4px base spacing grid
- Primary: Ocean Teal `#3B8EA5`, Deep Navy `#1C355E`

### API Communicatie
- REST via DRF (`/api/v1/`)
- JWT authenticatie
- Org-scoped requests via middleware
- React Query voor caching

---

## 7. Database

**120 models** verdeeld over 34 Django apps, **148 migrations**.

Kern hiërarchie:
```
Organisation → Membership → Project (nested) → ProjectMembership
    → BrandProfile → BrandAsset
    → Period (nested) → Activity → ActivityParticipation
    → Member → MediaItem
```

Content pipeline:
```
ContentTemplate → ContentField
GenerationRequest → GenerationResult → VideoJob → VideoPreset
```

Zie: [../architecture/data-model.md](../architecture/data-model.md)

---

## 8. Infrastructuur

| Service | Domein | Functie |
|---------|--------|---------|
| **backend** | api.teamreel.app | Django + Gunicorn (4 workers) |
| **frontend** | demo.teamreel.app | React + Vite (Vercel) |
| **celery-worker** | — | default + video_fast queues (c=2) |
| **video-worker** | — | video_slow queue (c=1, CPU-intensief) |
| **worker-ai** | — | ai_generation queue (c=1, rate-limited) |
| **celery-beat** | — | Periodieke taken (cleanup, metrics) |
| **Postgres** | — | Database |
| **Redis** | — | Celery broker + result backend |

Auto-deploy via git push naar `main`.

Zie: [../infrastructure/railway-services.md](../infrastructure/railway-services.md)
