# 355 — B78 — Template Customizer

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Frontend + Backend (TeamReel Product Feature) |
| Impact | 🟡 important |
| Effort | ~35 uur |

## Wat

Clubs kunnen bestaande content templates aanpassen aan hun stijl: layout varianten, tekst-posities, font keuzes, achtergrondstijl, logo plaatsing, en sponsor zichtbaarheid. TemplateCustomization model met JSON overrides per veld, customization schema per template (welke opties beschikbaar zijn), live preview in de editor, en auto-gegenereerde preview bij opslaan.

## Waarom belangrijk

Nu zijn templates fixed — alleen BrandProfile-kleuren worden automatisch toegepast. Clubs willen meer controle: "Logo links ipv rechts", "Grotere naam", "Andere achtergrondstijl." Zonder customizer is elke club-output identiek. Met customizer voelt het als "eigen" content — cruciaal voor adoptie en brand identity.

## Past in TeamReel / CoreApp

- **TeamReel**: Direct gebruikerswaarde. Elke club wil er uniek uitzien. De customizer is het verschil tussen "standaard template" en "ons design." Dit verlaagt churn: clubs die hun templates hebben aangepast, zijn meer invested en blijven langer.
- **CoreApp**: Template customization (schema-driven override systeem) is een generiek pattern voor elk content generation platform. Het JSON schema + override model is herbruikbaar.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B78-template-customizer

We bouwen een template customizer in Django 5 + DRF + React 18.

[feature summary]
Template aanpas-interface met live preview, schema-driven opties, en TemplateCustomization model.

[goals]
- TemplateCustomization model: content_template FK, project FK, name, customization_data (JSON), status (draft/active), preview_image FK
- ContentTemplate uitbreiding: customization_schema (JSON) — definieert beschikbare opties per veld
- Customization opties: layout varianten, tekst posities, font override, achtergrondstijl, logo plaatsing, sponsor toggle
- Live preview: frontend editor met real-time preview bij optie-wijzigingen
- Max 1 active customization per (template + project) combinatie
- Auto-gegenereerde preview bij opslaan (Celery task)
- Template kiezer in AI Studio toont "Mijn aangepaste versies"

[non-goals]
- Pixel-perfect WYSIWYG editor (het is een opties-panel, geen Canva)
- Custom template creation from scratch
- Animatie/video preview in editor (alleen static preview)

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery
- Content generation: GenerationTemplate + ContentField models (src/generative/)
- Branding: BrandProfile model (src/branding/)
- Files: FileAsset voor preview images (src/files/)
- Video generators: src/video/ moet customization_data ondersteunen
- Frontend: React 18, TypeScript, CSS Modules
- Tests: pytest + factory_boy (backend), Playwright (customizer flow)
```

### Plan

```
/spec-kitty.plan feature=B78-template-customizer

[tech choices]
- Schema: JSONField op ContentTemplate met Pydantic validatie
- Overrides: JSONField op TemplateCustomization, gevalideerd tegen schema
- Preview: Celery task die een dummy-render maakt met customization_data
- Frontend: sidebar met opties (formcontrols), main area met preview
- Active constraint: unique_together (template, project, status='active')
- Generator integration: customization_data als extra context in pipeline

[models]
- TemplateCustomization: content_template FK, project FK, name, customization_data (JSON), status (draft/active), preview_image FK, created_at, updated_at
- ContentTemplate uitbreiding: +customization_schema (JSONField, nullable)

[api endpoints]
- GET /api/v1/templates/{id}/customizations/ — customizations voor template
- POST /api/v1/templates/{id}/customizations/ — nieuwe customization
- PATCH /api/v1/customizations/{id}/ — customization bijwerken
- POST /api/v1/customizations/{id}/activate/ — activeer customization
- POST /api/v1/customizations/{id}/preview/ — genereer preview
- GET /api/v1/customizations/mine/ — alle eigen customizations

[frontend]
- demo/src/pages/TemplateCustomizer.tsx — customizer pagina
- demo/src/components/customizer/OptionsSidebar.tsx — opties panel
- demo/src/components/customizer/PreviewPane.tsx — live preview
- demo/src/components/customizer/OptionField.tsx — per optie-type control

[files to create]
- src/generative/customization.py — customization service + validation
- demo/src/pages/TemplateCustomizer.tsx + .module.css
- demo/src/components/customizer/ — editor components
- tests/test_customization/
```

### Research

```
/spec-kitty.research feature=B78-template-customizer

Onderzoek de volgende punten:

1. Hoe ziet het GenerationTemplate model eruit? Check src/generative/models.py voor velden en relaties.
2. Hoe worden templates nu gerenderd in de generation pipeline? Waar wordt template data gebruikt?
3. Welke aanpasbare opties zijn zinvol per content type? (line-up vs uitslag vs social post)
4. Hoe werkt de video generator? Check src/video/ voor hoe assets/posities verwerkt worden.
5. Welke BrandProfile velden worden nu al als defaults gebruikt bij generatie?
```
