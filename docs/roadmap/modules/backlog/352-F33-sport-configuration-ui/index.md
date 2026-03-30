# F33: Sport Configuration UI

**Priority:** 🟡 Belangrijk
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 352
**Category:** Frontend + Backend (TeamReel Product Feature)

## Description

## 352. F33 – Sport Configuration UI

**Doel**: Admin-interface voor het configureren van sporttypen, posities, formaties en bijbehorende content templates — zodat TeamReel zonder code-wijzigingen kan uitbreiden naar hockey, volleybal, handbal, etc.

**Waarom TeamReel**: Het businessplan noemt multisport-uitbreiding als fase 2 (Q2-Q3 2026). De backend `sport_configuration` app bestaat al (5 models), maar er is geen UI. Nu moeten nieuwe sporten via Django Admin of management commands toegevoegd worden.

**Wat moet er gebeuren**:

### Sport Configuration Pages
- **Overzichtspagina**: `/settings/sports`
  - Lijst van alle geconfigureerde sporten met status (actief/inactief)
  - Aantal teams dat elke sport gebruikt
  - Snel toggle actief/inactief

### Sport Detail Editor
- **Sport bewerken**: `/settings/sports/:sportId`
  - Naam, icoon, standaard formatie
  - Posities beheren (naam, afkorting, categorie: aanval/middenveld/verdediging/keeper)
  - Formaties beheren (naam, posities-layout als JSON grid)
  - Preview: visuele weergave van formatie met posities

### Formatie Visualisatie
- **Formatie editor**:
  - Drag & drop posities op een veld-layout
  - Voorgedefinieerde templates (4-3-3, 4-4-2 voor voetbal, drag-flick setup voor hockey, etc.)
  - Export als JSON dat direct door line-up generator gebruikt wordt

### Content Template Koppeling
- Per sport: welke content templates beschikbaar zijn
- Mapping sport-specifieke termen → template variabelen
- Voorbeeld: "doelpunt" (voetbal) vs "goal" (hockey) vs "punt" (volleybal)

### Backend API Uitbreiding
- ViewSets voor Sport, Position, Formation CRUD
- Org-scoped: federaties kunnen eigen sport configs beheren
- Seed command: `seed_sport_config` voor standaard sporten (voetbal, hockey, volleybal)

### Afhankelijkheden
- `sport_configuration` app (bestaand — 5 models)
- `content_generation` app (template koppeling)
- `branding` app (sport-specifieke assets)

### Scope & Effort
- **Effort**: ~30 uur
- **Lagen**: Frontend pagina's + componenten, Backend ViewSet uitbreiding
- **Risico**: Formatie editor UX-complexiteit — start simpel (dropdown), voeg drag-drop later toe
