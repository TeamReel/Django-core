# 346 — B71 — External Data Scraping

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🔴 critical |
| Effort | ~35 uur |

## Wat

Automatisch wedstrijddata, uitslagen, standen en programma's scrapen van publieke bronnen (voetbal.nl, KNVB-pagina's, clubwebsites). ScrapingSource model met configureerbare scrape-intervallen, ScrapingJob voor tracking, data mapping naar bestaande Activity/Period models, en adapter pattern per bron (VoetbalNLScraper, KNVBScraper, GenericScraper).

## Waarom belangrijk

De grootste drempel voor clubs is handmatig data invoeren. Een club met 20 teams moet elke week wedstrijden, uitslagen en standen bijwerken — dat doet niemand. Als dit automatisch binnenkomt van voetbal.nl, kan TeamReel direct content genereren zonder enige handmatige input. Dit is het verschil tussen "leuk erbij" en "onmisbaar."

## Past in TeamReel / CoreApp

- **TeamReel**: Kernwaarde-propositie. "Geen handmatig werk" is alleen waar als wedstrijddata automatisch binnenkomt. Voetbal.nl is de primaire bron voor het Nederlandse amateurvoetbal (90% van de doelgroep).
- **CoreApp**: Het scraper adapter pattern is herbruikbaar voor andere sporten en bronnen. De generieke scraper (CSS/XPath selectors) maakt het platform-agnostisch. Rate limiting en robots.txt respect zijn universele best practices.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B71-external-data-scraping

We bouwen een externe data scraping systeem in de Django 5 + DRF backend.

[feature summary]
Automatisch wedstrijddata scrapen van voetbal.nl en andere bronnen met adapter pattern, data mapping, en Celery scheduling.

[goals]
- ScrapingSource model: base_url, source_type, scrape_interval, selectors (JSON), status
- ScrapingJob model: tracking per scrape-run (items found/new/updated, errors)
- Scraper adapters: VoetbalNLScraper, KNVBScraper, GenericScraper (CSS/XPath)
- Data mapping: scraped data → Activity model (datum, tegenstander, uitslag, locatie)
- Celery-beat scheduling: periodiek scrapen (bijv. elke 6 uur)
- Safety: robots.txt respect, rate limiting (max 1 req/s/bron), User-Agent identification
- Optioneel: auto-generate content bij nieuwe uitslag

[non-goals]
- Scraping van niet-publieke data (achter login)
- Persoonsgegevens scrapen (GDPR)
- Real-time live scores
- Social media scraping

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery, celery-beat
- HTTP: httpx of requests met retry/backoff
- Parsing: beautifulsoup4 + lxml
- Activities: bestaand Activity model (src/activities/)
- Periods: bestaand Period model
- Tests: pytest + responses (mock HTTP)
```

### Plan

```
/spec-kitty.plan feature=B71-external-data-scraping

[tech choices]
- HTTP client: httpx (async support, retry, timeouts)
- Parser: beautifulsoup4 + lxml (snel, robuust)
- Adapter pattern: BaseScraper ABC, per-source implementatie
- Rate limiting: TokenBucket of simple sleep(1) per request
- Scheduling: celery-beat periodic task per active ScrapingSource
- Data mapping: configurable JSON mapping in ScrapingSource.selectors
- Dedup: hash van (source + external_id + date) voorkomt duplicaten

[models]
- ScrapingSource: org FK, name, base_url, source_type (enum), scrape_interval, selectors (JSON), status, last_scraped_at
- ScrapingJob: source FK, status, items_found, items_new, items_updated, error_log (text), timestamps
- ScrapingMapping: source FK, field_mapping (JSON) — maps external fields → Activity fields

[api endpoints]
- GET /api/v1/scraping/sources/ — lijst bronnen
- POST /api/v1/scraping/sources/ — bron koppelen
- POST /api/v1/scraping/sources/{id}/sync/ — handmatig triggeren
- GET /api/v1/scraping/sources/{id}/jobs/ — scraping history
- GET /api/v1/scraping/sources/{id}/preview/ — preview wat gescrapet wordt
- PUT /api/v1/scraping/sources/{id}/mapping/ — mapping configureren

[files to create]
- src/scraping/ — nieuwe Django app
- src/scraping/scrapers/ — adapter per bron type
- src/scraping/tasks.py — Celery scrape tasks
- tests/test_scraping/
```

### Research

```
/spec-kitty.research feature=B71-external-data-scraping

Onderzoek de volgende punten:

1. Hoe ziet de voetbal.nl website structuur eruit? Welke URLs bevatten programma/uitslagen?
2. Heeft voetbal.nl een API of is scraping de enige optie?
3. Hoe ziet het Activity model eruit? Welke velden moeten gevuld worden (src/activities/models.py)?
4. Wat is de robots.txt van voetbal.nl? Welke paden zijn toegestaan?
5. Hoeveel teams heeft een gemiddelde club? Wat is het verwachte scrape-volume?
```
