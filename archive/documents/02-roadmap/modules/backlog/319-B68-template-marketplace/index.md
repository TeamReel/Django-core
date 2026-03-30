````markdown
# B68: Template Marketplace

**Priority:** 🔥 Bouwen
**Phase:** 16
**Status:** 📋 ROADMAP
**Module ID:** 319
**Category:** Backend (TeamReel Product Feature)

## Description

## 319. B68 – Template Marketplace

**Doel**: Marktplaats waar clubs content-templates kunnen ontdekken, delen en gebruiken — zowel door TeamReel aangeboden als door de community gedeeld.

**Waarom TeamReel**: Templates zijn de kern van content-generatie. Een marketplace vergroot het aanbod, stimuleert hergebruik en creëert een netwerk-effect ("clubs inspireren clubs").

**Wat moet er gebeuren**:

### TemplateListingModel
- **TemplateListing model**:
  - Fields: template FK, title, description, preview_image, category
  - Author: organisation FK (creator) of system (TeamReel-made)
  - Visibility: public/private/organisation-only
  - Stats: usage_count, favorite_count, rating_avg
  - Timestamps: created_at, updated_at, published_at

### TemplateCategory Model
- **TemplateCategory model**:
  - Fields: name, slug, icon, parent (self-FK voor hiërarchie)
  - Voorbeelden: Wedstrijddag, Line-up, Social Post, Seizoensoverzicht, Sponsor

### TemplateFavorite Model
- **TemplateFavorite model**:
  - Fields: user FK, template_listing FK
  - Unique constraint: (user, template_listing)

### TemplateReview Model (optioneel)
- **TemplateReview model**:
  - Fields: user FK, template_listing FK, rating (1-5), review_text
  - Moderation: is_approved

### Workflow
1. Club maakt template → publiceert naar marketplace (of houdt privé)
2. Andere clubs browsen categorie / zoeken
3. "Gebruik template" → kopieert naar eigen project
4. Originele auteur ziet usage stats

### Permissions
- Iedereen kan publieke templates browsen
- Alleen project admins kunnen templates publiceren
- Eigen templates bewerken/verwijderen
- TeamReel admins: featured templates, moderation

### Integration
- Bestaande template/brand systeem
- B22 (file storage voor previews)
- B09 (audit logging)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/marketplace/templates/` — Browse/search templates (filters: category, sort)
- `GET /api/v1/marketplace/templates/{id}/` — Template detail + previews
- `POST /api/v1/marketplace/templates/` — Publiceer template
- `POST /api/v1/marketplace/templates/{id}/use/` — Kopieer template naar eigen project
- `POST /api/v1/marketplace/templates/{id}/favorite/` — Favoriet toevoegen
- `DELETE /api/v1/marketplace/templates/{id}/favorite/` — Favoriet verwijderen
- `GET /api/v1/marketplace/categories/` — Lijst categorieën

**Status**: 📋 ROADMAP

## Notes
- Nieuw module, toegevoegd op verzoek
- Creëert netwerk-effect en vergroot template-aanbod

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
