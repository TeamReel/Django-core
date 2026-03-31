# 348 — B73 — Sponsor Management

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🟡 important |
| Effort | ~25 uur |

## Wat

Sponsors beheren per club/team met logo's, niveaus (hoofdsponsor, shirtsponsor, bordsponsor) en automatische integratie in gegenereerde content. Sponsor model met FileAsset-gekoppeld logo, SponsorPlacement voor positie in content (primary/secondary/watermark), en automatische injection in de content generation pipeline.

## Waarom belangrijk

Sponsors zijn de geldbron van amateurclubs. Als sponsor-logo's automatisch in wedstrijdgraphics, video's en line-ups verschijnen, levert TeamReel directe waarde voor zowel club als sponsor. Dit is ook een upsell-argument richting clubs: "Laat je sponsors zien in elke post." En richting sponsors: "Jouw logo in 50+ publicaties per seizoen."

## Past in TeamReel / CoreApp

- **TeamReel**: Directe kernwaarde. Elke club heeft 3-10 sponsors die zichtbaarheid verwachten. Automatische sponsor-integratie in content is een uniek verkoopargument. Het businessplan noemt dit als waardetoevoeging voor het club-segment.
- **CoreApp**: Sponsor management is specifiek voor organisatie-platforms, maar het concept (branding assets + placements + injection) is toepasbaar op elke white-label oplossing.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B73-sponsor-management

We bouwen sponsor management in de Django 5 + DRF backend.

[feature summary]
Sponsorbeheer met logo's, niveaus, placement configuratie, en automatische integratie in content generatie.

[goals]
- Sponsor model: name, logo (FileAsset FK), website, level (configurable), scope (org of project)
- SponsorPlacement: sponsor FK, content_type, position (primary/secondary/watermark), priority
- Automatische injection in content generation pipeline
- BrandProfile uitbreiding met sponsor-configuratie
- Sponsor visibility stats: views/impressies per sponsor per periode

[non-goals]
- Sponsor billing/invoicing
- Sponsor self-service portal
- A/B testing van sponsor placements
- Sponsor ROI berekening

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Branding: bestaand BrandProfile model (src/branding/)
- Files: FileAsset model (src/files/) voor logo uploads
- Content generation: GenerationTemplate + pipeline (src/generative/)
- Video: FFmpeg-based generators (src/video/)
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B73-sponsor-management

[tech choices]
- Models: Sponsor, SponsorPlacement
- Logo storage: FileAsset FK (bestaand systeem, S3-backed)
- Levels: configurable via JSONField of choices (hoofdsponsor, shirtsponsor, etc.)
- Pipeline integration: sponsor data als extra context in generation requests
- Video integration: sponsor logo overlay via FFmpeg filter
- Admin: Django Admin voor sponsor CRUD + inline placements

[models]
- Sponsor: org FK, project FK (nullable), name, logo FK, website_url, level (enum), status (active/paused/expired), start_date, end_date
- SponsorPlacement: sponsor FK, content_type (enum), position (enum), priority (int)

[api endpoints]
- GET /api/v1/sponsors/ — sponsors voor org/project
- POST /api/v1/sponsors/ — sponsor toevoegen
- PUT /api/v1/sponsors/{id}/ — sponsor bijwerken
- GET /api/v1/sponsors/{id}/stats/ — visibility cijfers
- GET/PUT /api/v1/sponsor-placements/ — placement config

[files to create]
- src/sponsors/ — nieuwe Django app
- src/generative/sponsor_injection.py — pipeline integration
- tests/test_sponsors/
```

### Research

```
/spec-kitty.research feature=B73-sponsor-management

Onderzoek de volgende punten:

1. Hoe ziet het BrandProfile model eruit? (src/branding/models.py) Welke brand-gerelateerde velden zijn er?
2. Hoe werkt de content generation pipeline? Waar wordt context/data doorgegeven aan templates?
3. Hoe worden assets (logo's) verwerkt in de video pipeline? Check src/video/ voor image overlay patterns.
4. Zijn er al sponsor-gerelateerde velden of modellen in de codebase?
5. Hoeveel sponsors heeft een gemiddelde amateurclub? (voor scope inschatting)
```
