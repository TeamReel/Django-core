````markdown
# B69: Multi-language Content

**Priority:** 🔥 Bouwen
**Phase:** 16
**Status:** 📋 ROADMAP
**Module ID:** 320
**Category:** Backend (TeamReel Product Feature)

## Description

## 320. B69 – Multi-language Content

**Doel**: Automatisch vertalen van gegenereerde content (titels, beschrijvingen, social captions) naar meerdere talen, zodat clubs met internationale leden of in meertalige regio's content in de juiste taal kunnen publiceren.

**Waarom TeamReel**: Nederland heeft veel clubs met leden die andere talen spreken. Belgische clubs hebben NL/FR nodig. Internationale clubs willen EN. Automatische vertaling op content-niveau maakt dit moeiteloos.

**Wat moet er gebeuren**:

### ContentTranslation Model
- **ContentTranslation model**:
  - Fields: content_type (GenericFK), object_id, language (ISO 639-1), field_name
  - Translation: translated_text, source_text, translation_method (ai/manual)
  - Quality: is_reviewed, reviewed_by (User FK nullable)
  - Timestamps: created_at, updated_at

### ProjectLanguageConfig
- **ProjectLanguageConfig model**:
  - Fields: project FK, primary_language, additional_languages (ArrayField)
  - Auto-translate: auto_translate_on_publish (bool)
  - Defaults: NL voor Nederlandse clubs

### Translation Service
- **AI Translation**:
  - OpenAI / Google Translate API adapter pattern
  - Context-aware: sportterminologie, clubnamen niet vertalen
  - Batch translation: meerdere velden in één API call
  - Caching: zelfde brontekst → cached vertaling
- **Manual override**:
  - Gebruiker kan AI-vertaling aanpassen
  - Reviewed vertalingen krijgen voorrang boven AI

### Workflow
1. Content wordt gegenereerd in primaire taal
2. Bij publicatie (of handmatig): vertaal naar geconfigureerde talen
3. Celery task voor async vertaling
4. Vertaalde versies beschikbaar via API (Accept-Language of query param)
5. Optioneel: handmatige review voor belangrijke content

### Integration
- Bestaande generative pipeline
- B15 (Celery async)
- i18n_preferences (bestaand)
- OpenAI API (bestaand)

**Scope**: 🔧 **Backend Only** (Django app + REST API + Celery tasks + tests + README)

**API Endpoints**:
- `GET /api/v1/content/{id}/translations/` — Alle vertalingen voor content item
- `POST /api/v1/content/{id}/translate/` — Vertaling aanvragen (target language)
- `PATCH /api/v1/translations/{id}/` — Handmatige vertaling aanpassen
- `POST /api/v1/translations/{id}/review/` — Vertaling markeren als reviewed
- `GET /api/v1/projects/{id}/languages/` — Taalconfiguratie project
- `PATCH /api/v1/projects/{id}/languages/` — Taalconfiguratie aanpassen

**Status**: 📋 ROADMAP

## Notes
- Nieuw module, toegevoegd op verzoek
- Belangrijk voor meertalige clubs (België, internationale teams)
- Bouwt voort op bestaande OpenAI integratie

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
````
