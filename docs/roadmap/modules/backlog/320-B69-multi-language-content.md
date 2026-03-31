# 320 — B69 — Multi-language Content

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🟡 important |
| Effort | ~25 uur |

## Wat

Automatisch vertalen van gegenereerde content (titels, beschrijvingen, social captions) naar meerdere talen via AI. ContentTranslation model met GenericFK, ProjectLanguageConfig voor taalinstelling per team, AI-vertaling via OpenAI met sportterminologie-awareness, handmatige override mogelijkheid, en async vertaling via Celery.

## Waarom belangrijk

Nederland heeft veel clubs met internationale leden. Belgische clubs hebben NL/FR nodig. Jeugdteams met ouders die geen Nederlands spreken missen informatie. Automatische vertaling op content-niveau maakt inclusiviteit moeiteloos — de club hoeft niets te doen.

## Past in TeamReel / CoreApp

- **TeamReel**: Directe waarde voor meertalige clubs. Een voetbalclub in Amsterdam met spelers uit 15 nationaliteiten kan line-ups en mededelingen in meerdere talen publiceren. België (NL/FR/DE) is een natuurlijke expansiemarkt.
- **CoreApp**: Content translation is een generiek pattern. Het adapter-model (OpenAI nu, Google Translate later) maakt het herbruikbaar. De GenericFK-aanpak werkt voor elk content model.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B69-multi-language-content

We bouwen automatische content vertaling in de Django 5 + DRF backend.

[feature summary]
AI-powered content vertaling met ContentTranslation model, taalconfiguratie per project, en async vertaling via Celery.

[goals]
- ContentTranslation model: GenericFK, language (ISO 639-1), field_name, translated_text, method (ai/manual)
- ProjectLanguageConfig: primary_language, additional_languages, auto_translate_on_publish
- AI vertaling via OpenAI API (bestaande integratie)
- Context-aware: sportterminologie, clubnamen niet vertalen
- Batch vertaling: meerdere velden in één API call
- Caching: zelfde brontekst → cached vertaling
- Handmatige override: reviewed vertalingen krijgen voorrang

[non-goals]
- UI/interface vertaling (i18n — dat is een ander systeem)
- Real-time vertaling (async is voldoende)
- Spraak-naar-tekst vertaling

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- AI: OpenAI API (al geïntegreerd in src/generative/)
- Async: Celery workers
- Content models: diverse models met tekstvelden (GenericFK)
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B69-multi-language-content

[tech choices]
- Translation model: GenericFK via ContentType framework
- AI adapter: TranslationService met OpenAI adapter (swappable)
- Batch: verzamel alle tekstvelden, vertaal in één OpenAI call met context
- Cache: database-level (zelfde brontekst = bestaande vertaling hergebruiken)
- Async: Celery task translate_content op default queue
- API: Accept-Language header of ?lang= query param voor vertaalde content

[models]
- ContentTranslation: content_type, object_id, language, field_name, translated_text, source_text, method, is_reviewed
- ProjectLanguageConfig: project FK, primary_language, additional_languages (ArrayField), auto_translate

[api endpoints]
- GET /api/v1/content/{id}/translations/ — vertalingen voor content item
- POST /api/v1/content/{id}/translate/ — vertaling aanvragen
- PATCH /api/v1/translations/{id}/ — handmatige aanpassing
- POST /api/v1/translations/{id}/review/ — markeer als reviewed
- GET/PATCH /api/v1/projects/{id}/languages/ — taalconfiguratie

[files to create]
- src/translations/ — nieuwe Django app
- src/translations/services.py — TranslationService met OpenAI adapter
- tests/test_translations/
```

### Research

```
/spec-kitty.research feature=B69-multi-language-content

Onderzoek de volgende punten:

1. Hoe is de OpenAI integratie nu opgezet? Check src/generative/ voor API call patterns.
2. Welke content models hebben tekstvelden die vertaald moeten worden? Maak een inventaris.
3. Bestaat er al een i18n/taal-configuratie in het project? Check settings en bestaande models.
4. Hoe worden GenericForeignKeys elders in de codebase gebruikt?
5. Wat zijn de kosten van OpenAI vertaling per content item? (tokens schatting)
```
