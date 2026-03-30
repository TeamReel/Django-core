# B78: Template Customizer

**Priority:** 🟡 Belangrijk
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 355
**Category:** Frontend + Backend (TeamReel Product Feature)

## Description

## 355. B78 – Template Customizer

**Doel**: Clubs kunnen bestaande content templates aanpassen aan hun stijl — kleuren, layout-varianten, tekst-posities en font-keuzes — zonder technische kennis.

**Waarom TeamReel**: B68 (Template Marketplace) is een marktplaats voor het ontdekken en delen van templates. Maar de basis mist: een gebruiksvriendelijke editor waarmee clubs een template nemen en aanpassen. Nu zijn templates fixed en worden alleen BrandProfile-kleuren automatisch toegepast. Clubs willen meer controle: "logo links ipv rechts", "grotere naam", "andere achtergrondstijl".

**Wat moet er gebeuren**:

### TemplateCustomization Model
- **TemplateCustomization model**:
  - Fields: content_template FK (bron-template), project FK (club/team), name
  - Overrides: customization_data (JSONField) — per content field een override
  - Status: draft, active (max 1 active per template+project combinatie)
  - Preview: preview_image (FileAsset FK) — auto-gegenereerde preview

### Customization Options
- **Layout varianten**: template definieert 2-4 layout opties (bijv. "klassiek", "modern", "compact")
- **Tekst posities**: boven/onder/overlay — instelbaar per text element
- **Font override**: keuze uit 3-5 beschikbare fonts (system fonts + 2 optionele)
- **Achtergrondstijl**: solid color, gradient, afbeelding, transparant
- **Logo plaatsing**: links-boven, rechts-boven, gecentreerd, verborgen
- **Extra elementen**: sponsor logo tonen/verbergen, competitie badge tonen/verbergen

### Template Schema Uitbreiding
- ContentTemplate krijgt een `customization_schema` (JSONField):
  - Definieert welke velden aanpasbaar zijn
  - Per veld: type (color, enum, position, toggle), default, opties
  - Validatie: welke combinaties toegestaan zijn
- Content generators lezen customization_data mee bij generatie  

### Frontend: Customizer UI
- **Customizer pagina**: `/templates/:templateId/customize`
  - Live preview met geselecteerde opties
  - Sidebar met aanpasbare opties (grouped per categorie)
  - "Reset naar standaard" knop
  - "Opslaan als mijn versie" → TemplateCustomization aanmaken
- **Template kiezer** in AI Studio toont:
  - Standaard templates
  - "Mijn aangepaste versies" sectie
  - Quick-preview bij hover

### Preview Generatie
- Bij opslaan: genereer preview-afbeelding met dummy data + customization
- Celery task op `default` queue
- Cache preview tot customization wijzigt

### Afhankelijkheden
- `content_generation` app (ContentTemplate, ContentField — uitbreiden)
- `branding` app (BrandProfile — base values die overschreven kunnen worden)
- `video` app (generators moeten customization_data ondersteunen)

### Scope & Effort
- **Effort**: ~35 uur
- **Lagen**: Backend model + schema uitbreiding, Frontend customizer UI, Generator integratie
- **Risico**: Te veel opties = verwarrend. Start met 3-5 opties per template, uitbreiden op basis van gebruikersfeedback.
