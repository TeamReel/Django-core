# F32: Public Club Feed

**Priority:** 🔥 Bouwen
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 349
**Category:** Frontend + Backend (TeamReel Product Feature)

## Description

## 349. F32 – Public Club Feed & Embed Widget

**Doel**: Een publieke pagina per club die alle gepubliceerde content toont, plus een embeddable widget voor de clubwebsite. Viral loop: iedereen kan TeamReel-content zien zonder account.

**Waarom TeamReel**: Clubs willen hun content tonen op hun eigen website en delen met leden die geen TeamReel-account hebben. Een publieke feed is ook de eerste kennismaking voor nieuwe clubs: "Kijk wat die club maakt met TeamReel."

**Wat moet er gebeuren**:

### Public Feed Page
- **Route**: `/club/{slug}` — publieke club pagina
- Toont: alle gepubliceerde content (graphics, video's, line-ups) in chronologische volgorde
- Club branding: logo, kleuren, naam
- Responsive: mobile-first grid layout
- Geen login vereist
- SEO-optimized: Open Graph tags, structured data

### Embed Widget
- **Route**: `/embed/{slug}` — iframe-friendly versie
- Compact layout voor inbedding op clubwebsites
- Configurable: aantal items, layout (grid/carousel/list)
- Embed code generator in TeamReel dashboard
- Responsive within iframe
- Cross-origin safe (X-Frame-Options: ALLOWALL voor embed route)

### ClubProfile (public)
- **PublicProfile model** (of BrandProfile uitbreiding):
  - Fields: slug (unique), public_name, public_description, social_links
  - Settings: is_public (boolean), show_sponsors, items_per_page
  - Generated: Meta tags, OG image

### Content Visibility
- Alleen content met status "published" + "approved" (als approval actief)
- Club kan per content item visibility toggen (public/private)
- Geen member data zichtbaar op publieke pagina
- Rate limiting op publieke endpoints

### Integration
- B33 (BrandProfile voor styling)
- B34 (gepubliceerde content)
- B73 (sponsor logos in feed, als actief)
- B72 (share links vanuit feed items)

**Scope**: 🔧 **Backend + Frontend** (Django views + React components + tests)

**API Endpoints**:
- `GET /api/v1/public/club/{slug}/` — Public club profile
- `GET /api/v1/public/club/{slug}/feed/` — Paginated content feed
- `GET /api/v1/public/club/{slug}/feed/{id}/` — Single content item
- `PUT /api/v1/club/public-settings/` — Configure public profile (authenticated)

**Status**: 📋 ROADMAP
