# Extending the Core Platform

> Hoe je een nieuw product bouwt op de 80/20 foundation.

---

## 1. Principe

Het core platform levert 80% van wat een moderne web app nodig heeft. Jouw product voegt de resterende 20% toe:

- **Domain-specifieke models** — de data die uniek is voor jouw product
- **Custom templates/content types** — wat er gegenereerd of getoond wordt
- **Business logic** — regels die specifiek zijn voor jouw domein
- **UI aanpassingen** — pagina's en flows die passen bij jouw gebruikers

---

## 2. Wat je krijgt van het Core

| Capability | Wat je NIET hoeft te bouwen |
|-----------|---------------------------|
| **Auth & Multi-tenancy** | User model, JWT, organisations, projects, RBAC, permissions |
| **File Management** | S3 upload/download, thumbnails, metadata |
| **AI Pipeline** | GenerationRequest → Provider → Result framework |
| **Video Processing** | FFmpeg jobs, presets, queues |
| **Notificaties** | Multi-channel delivery, user preferences |
| **Background Tasks** | Celery setup, queues, monitoring |
| **Credits** | Balance, transactions, usage tracking |
| **Search** | PostgreSQL full-text search |
| **Audit** | Change logging |
| **Frontend** | Design tokens, component library, app shell, sidebar |

---

## 3. Hoe TeamReel het Core Uitbreidt

TeamReel is het bewijs dat het 80/20 model werkt. Hier is wat TeamReel toevoegt:

### Backend (9 Django apps)
```
src/activities/          → Wedstrijden, trainingen, events
src/activity_feed/       → Timeline per team
src/branding/            → BrandProfile, BrandAsset (clubidentiteit)
src/content_generation/  → ContentTemplate, ContentField
src/sport_configuration/ → Sport types, posities, formaties
src/generative/          → AI providers, prompts, generation jobs
src/video/               → VideoJob, VideoPreset, FFmpeg pipeline
src/medialib/            → MediaItem, MediaCollection
src/workflows/           → Approval flows, state machine
```

### Frontend (key additions)
```
demo/src/pages/studio/        → AI Studio (generatie + preview)
demo/src/pages/matches/       → Wedstrijdbeheer
demo/src/pages/teams/         → Team hiërarchie
demo/src/pages/content/       → Contentbibliotheek
demo/src/pages/medialib/      → Media library
demo/src/components/brand/    → Brand token editing
demo/src/components/lineup/   → Opstelling visualisatie
demo/src/components/video/    → Video preview + review
```

---

## 4. Stappen voor een Nieuw Product

### Stap 1: Domain Models
Maak Django apps voor jouw domein. Gebruik de bestaande `Organisation` en `Project` als tenant-root.

```python
# Voorbeeld: e-commerce product
class Product(models.Model):
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # ... domain-specifieke velden
```

### Stap 2: ViewSets met Org-Scoping
Alle ViewSets moeten org-scoped zijn:

```python
class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasProjectAccess]

    def get_queryset(self):
        return Product.objects.filter(
            project__organisation=self.request.user.active_organisation
        ).select_related('project')
```

### Stap 3: Frontend Pagina's
Voeg routes toe aan de React app. Gebruik bestaande componenten en design tokens.

### Stap 4: Koppel aan Core Features
- Gebruik `credits` voor verbruiksbeheer
- Gebruik `notifications` voor meldingen
- Gebruik `files` (FileAsset) voor uploads
- Gebruik `generative` voor AI content
- Gebruik `workflows` voor goedkeuringsflows

---

## 5. Conventies

| Regel | Detail |
|-------|--------|
| **Org-scoped queries** | Altijd filteren op `organisation` |
| **Permission classes** | Op elke ViewSet |
| **Select/prefetch related** | Geen N+1 queries |
| **Type hints** | Python PEP8 + type hints |
| **TypeScript strict** | Geen `any`, interfaces voor API responses |
| **Design tokens** | CSS variables, geen hardcoded waardes |
| **Tests** | pytest (backend), Playwright (critical flows) |

Zie: [../guides/extending-core.md](../guides/extending-core.md) voor de volledige development guide.
