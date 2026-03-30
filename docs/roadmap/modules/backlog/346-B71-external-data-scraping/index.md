# B71: External Data Scraping

**Priority:** 🔥 Bouwen
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 346
**Category:** Backend (TeamReel Product Feature)

## Description

## 346. B71 – External Data Scraping

**Doel**: Automatisch wedstrijddata, uitslagen, standen en programma's scrapen van publieke bronnen (voetbal.nl, KNVB-pagina's, clubwebsites) zodat clubs niet handmatig hoeven invoeren.

**Waarom TeamReel**: De grootste drempel voor clubs is handmatig data invoeren. Als wedstrijden, uitslagen en teamindelingen automatisch binnenkomen, kan TeamReel direct content genereren zonder enige input van de gebruiker.

**Wat moet er gebeuren**:

### ScrapingSource Model
- **ScrapingSource model**:
  - Fields: name, base_url, source_type (voetbal_nl, knvb, club_website, custom)
  - Config: scrape_interval (timedelta), selectors (JSONField), auth_config (encrypted, optioneel)
  - Status: active, paused, error, rate_limited
  - Owner: organisation FK

### ScrapingJob Model
- **ScrapingJob model**:
  - Fields: source FK, status (pending/running/completed/failed), started_at, completed_at
  - Results: items_found, items_new, items_updated, error_log
  - Retry: attempt_count, next_retry_at

### Data Mapping
- **ScrapingMapping model**:
  - Maps scraped data → Activity fields (datum, tegenstander, uitslag, locatie)
  - Maps scraped data → Period fields (competitie, seizoen)
  - Maps scraped data → Member references (spelers, als beschikbaar)
  - Configurable per source type

### Scraper Adapters
- **VoetbalNLScraper**: Programma's, uitslagen, standen van voetbal.nl
- **KNVBScraper**: Officiële wedstrijddata
- **GenericScraper**: Configurable CSS/XPath selectors voor clubwebsites
- Elke adapter: rate limiting, respectful crawling (robots.txt), retry logic

### Workflow
1. Club koppelt team aan externe bron (bijv. voetbal.nl team-URL)
2. Celery-beat scrapt periodiek (bijv. elke 6 uur)
3. Nieuwe wedstrijden → automatisch Activity aangemaakt
4. Uitslagen → Activity updated met score
5. Optioneel: automatisch content genereren bij nieuwe uitslag

### Safety & Ethics
- Respecteer robots.txt en rate limits
- User-Agent identification
- Geen overmatig verkeer (max 1 request per seconde per bron)
- Fallback bij blokkering: handmatige invoer blijft werken
- GDPR: geen persoonsgegevens scrapen tenzij publiek + toestemming

### Integration
- B15 (Celery tasks voor periodiek scrapen)
- B30 (Activities aanmaken/updaten)
- B34 (optioneel: auto-generate content bij nieuwe data)
- B17 (notificatie bij nieuwe wedstrijddata)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/scraping/sources/` — Lijst van gekoppelde bronnen
- `POST /api/v1/scraping/sources/` — Nieuwe bron koppelen
- `POST /api/v1/scraping/sources/{id}/sync/` — Handmatig sync triggeren
- `GET /api/v1/scraping/sources/{id}/jobs/` — Scraping history
- `GET /api/v1/scraping/sources/{id}/preview/` — Preview wat er gescrapet wordt
- `PUT /api/v1/scraping/sources/{id}/mapping/` — Data mapping configureren

**Status**: 📋 ROADMAP
