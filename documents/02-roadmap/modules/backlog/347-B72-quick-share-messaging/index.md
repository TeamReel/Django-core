# B72: Quick Share (Messaging)

**Priority:** 🔥 Bouwen
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 347
**Category:** Backend + Frontend (TeamReel Product Feature)

## Description

## 347. B72 – Quick Share via Messaging

**Doel**: One-tap delen van gegenereerde content naar WhatsApp, Telegram en andere messaging-apps. Geen OAuth nodig — gebruikt native share APIs en deep links.

**Waarom TeamReel**: Amateur clubs communiceren via WhatsApp-groepen, niet via Instagram. De snelste weg naar adoptie is content direct deelbaar maken in het kanaal waar het team al zit.

**Wat moet er gebeuren**:

### ShareLink Model
- **ShareLink model**:
  - Fields: content_type (GenericFK), object_id, short_code (unique, 8 chars)
  - Tracking: view_count, share_count, created_by (User FK)
  - Expiry: expires_at (optioneel, default: geen expiry)
  - Public URL: `/s/{short_code}` → public preview page

### Share Targets
- **WhatsApp**: `whatsapp://send?text={caption}+{url}` deep link
- **Telegram**: `https://t.me/share/url?url={url}&text={caption}`
- **Clipboard**: Kopieer link + caption
- **Native Share API**: Web Share API (`navigator.share()`) als fallback
- Per target: pre-formatted caption met relevante info (wedstrijd, score, team)

### Public Preview Page
- Lightweight public page op `/s/{short_code}`
- Toont: afbeelding/video, club naam, wedstrijdinfo
- Open Graph meta tags voor rich previews in WhatsApp/Telegram
- Geen login vereist
- Mobile-optimized (full-width media, minimal chrome)

### Caption Generation
- Auto-generated caption per content type:
  - Line-up: "Opstelling {team} vs {tegenstander} — {datum}"
  - Match result: "{team} {score} {tegenstander} 🏆"
  - Video: "{team} highlights — {competitie}"
- Bewerkbaar door gebruiker voor delen

### Integration
- B22 (file URLs voor media)
- B55 (video share links)
- B34 (generated content)
- Frontend: ShareButton component met target keuze

**Scope**: 🔧 **Backend + Frontend** (Django app + React component + tests)

**API Endpoints**:
- `POST /api/v1/share/` — Maak share link voor content
- `GET /api/v1/share/{short_code}/` — Get share link details
- `GET /s/{short_code}` — Public preview page (server-rendered)
- `GET /api/v1/share/{short_code}/stats/` — View/share counts

**Status**: 📋 ROADMAP
