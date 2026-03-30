# B73: Sponsor Management

**Priority:** 🔥 Bouwen
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 348
**Category:** Backend (TeamReel Product Feature)

## Description

## 348. B73 – Sponsor Management

**Doel**: Sponsors beheren per club/team met logo's, niveaus en automatische integratie in gegenereerde content. Sponsoren krijgen zichtbaarheid, clubs krijgen waarde voor hun partners.

**Waarom TeamReel**: Sponsors zijn de geldbron van amateurclubs. Als sponsor-logo's automatisch in wedstrijdgraphics, video's en line-ups verschijnen, levert TeamReel directe waarde voor zowel de club als de sponsor. Dit is ook een upsell-argument: "Laat je sponsors zien in elke post."

**Wat moet er gebeuren**:

### Sponsor Model
- **Sponsor model**:
  - Fields: name, logo (FileAsset FK), website_url, description
  - Level: hoofdsponsor, shirtsponsor, bordsponsor, jeugdsponsor (configurable)
  - Scope: organisation of project (team-specifieke sponsors)
  - Status: active, paused, expired
  - Contract: start_date, end_date (optioneel)

### SponsorPlacement Model
- **SponsorPlacement model**:
  - Fields: sponsor FK, content_type (line_up, match_graphic, video, all)
  - Position: primary (groot/prominent), secondary (klein/footer), watermark
  - Priority: ordering bij meerdere sponsors

### Integration met Content Generation
- BrandProfile uitbreiden met sponsor-configuratie
- ContentTemplate krijgt sponsor placement zones
- Bij generatie: sponsor logo's automatisch in juiste positie
- Video: sponsor intro/outro of overlay

### Sponsor Dashboard (toekomst)
- Views/impressies per sponsor per periode
- Welk content type levert meeste zichtbaarheid
- Export-ready rapport voor sponsorgesprekken

### Integration
- B33 (BrandProfile uitbreiding)
- B22 (logo file management)
- B31 (ContentTemplate sponsor zones)
- B34 (generation pipeline: sponsor injection)
- B55 (video: sponsor overlay)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/sponsors/` — Lijst sponsors voor org/project
- `POST /api/v1/sponsors/` — Sponsor toevoegen
- `PUT /api/v1/sponsors/{id}/` — Sponsor bijwerken
- `GET /api/v1/sponsors/{id}/stats/` — Zichtbaarheidscijfers
- `GET /api/v1/sponsor-placements/` — Placement configuratie
- `PUT /api/v1/sponsor-placements/{id}/` — Placement aanpassen

**Status**: 📋 ROADMAP
