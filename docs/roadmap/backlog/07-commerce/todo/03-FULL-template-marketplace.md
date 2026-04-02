# 319 — B68 — Template Marketplace

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🟡 important |
| Effort | ~30 uur |

## Wat

Marktplaats waar clubs content-templates ontdekken, delen en gebruiken. TemplateListing model met auteur, categorie, usage stats en ratings. Clubs publiceren eigen templates, andere clubs browsen en kopiëren met één klik. Creëert een netwerk-effect: "clubs inspireren clubs."

## Waarom belangrijk

Templates zijn de kern van content-generatie in TeamReel. Hoe meer templates beschikbaar zijn, hoe meer variatie clubs hebben. Een marketplace stimuleert hergebruik, verlaagt de drempel voor nieuwe clubs ("ik hoef niet zelf te ontwerpen"), en creëert een community-effect. Featured templates van TeamReel tonen wat mogelijk is.

## Past in TeamReel / CoreApp

- **TeamReel**: Directe waarde — clubs met design-skills delen hun templates, clubs zonder design-skills profiteren. TeamReel kan "official templates" aanbieden als premium content. Het businessplan noemt templates als een van de kernproducten.
- **CoreApp**: Template marketplace is specifiek voor content platforms, maar het pattern (listings, categories, favorites, reviews) is herbruikbaar voor elk product met een marketplace-achtige feature.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B68-template-marketplace

We bouwen een template marketplace in de Django 5 + DRF backend.

[feature summary]
Marketplace voor content templates met listings, categorieën, favorites, usage tracking, en one-click template kopiëren.

[goals]
- TemplateListing model: template FK, title, description, preview, category, author org
- TemplateCategory: hierarchisch (parent self-FK), icon, slug
- TemplateFavorite: user bookmark systeem
- Browse/search: filters op categorie, sort op populariteit/datum
- "Gebruik template" actie: kopieert template naar eigen project
- Usage stats: view_count, usage_count, favorite_count per listing
- Permissions: iedereen browst publieke templates, admins publiceren

[non-goals]
- Revenue sharing voor template creators
- Template versioning (dat is content_generation concern)
- Template editor (dat is B78 Template Customizer)

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Templates: bestaand GenerationTemplate model (src/generative/)
- Files: FileAsset model voor preview images (src/files/)
- Search: django-filter voor filtering, PostgreSQL full-text search
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B68-template-marketplace

[tech choices]
- Models: TemplateListing, TemplateCategory, TemplateFavorite, TemplateReview (optioneel)
- Search: django-filter + SearchFilter (DRF) op title/description
- Popularity: annotatie met Count('favorites') en Count('usages')
- Copy: deep-copy GenerationTemplate + fields naar target project
- Categories: MPTT of django-treebeard voor hiërarchie (of simple parent FK)
- Cache: Redis voor populaire listings (TTL 1 uur)

[models]
- TemplateListing: template FK, title, description, preview_image FK, category FK, author_org FK, visibility, usage_count, favorite_count
- TemplateCategory: name, slug, icon, parent (self FK)
- TemplateFavorite: user FK, listing FK (unique together)

[api endpoints]
- GET /api/v1/marketplace/templates/ — browse/search (filters, sort)
- GET /api/v1/marketplace/templates/{id}/ — detail + previews
- POST /api/v1/marketplace/templates/ — publiceer template
- POST /api/v1/marketplace/templates/{id}/use/ — kopieer naar eigen project
- POST/DELETE /api/v1/marketplace/templates/{id}/favorite/ — toggle favoriet
- GET /api/v1/marketplace/categories/ — alle categorieën

[files to create]
- src/marketplace/ — nieuwe Django app
- tests/test_marketplace/
```

### Research

```
/spec-kitty.research feature=B68-template-marketplace

Onderzoek de volgende punten:

1. Hoe ziet het GenerationTemplate model eruit? (src/generative/models.py) Welke velden heeft het?
2. Zijn templates nu al org-scoped of globaal? Hoe werkt ownership?
3. Hoe werkt het kopiëren van een template technisch? Welke relaties moeten meegekopieerd worden?
4. Hoeveel templates bestaan er momenteel in de database?
5. Welke categorie-indeling past bij de huidige content types (wedstrijddag, line-up, social post, etc.)?
```
