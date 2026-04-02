# 352 — F33 — Sport Configuration UI

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Frontend + Backend (TeamReel Product Feature) |
| Impact | 🟡 important |
| Effort | ~30 uur |

## Wat

Admin-interface voor het configureren van sporttypen, posities, formaties en bijbehorende content templates. Overzichtspagina met alle sporten, detail-editor per sport (posities, formaties), visuele formatie-editor (drag & drop posities op veld), content template koppeling per sport, en backend ViewSet uitbreiding voor CRUD.

## Waarom belangrijk

Het businessplan noemt multisport-uitbreiding als fase 2 (Q2-Q3 2026). De backend `sport_configuration` app bestaat al (5 models), maar er is geen UI. Nu moeten nieuwe sporten via Django Admin worden toegevoegd. Een gebruiksvriendelijke UI maakt het mogelijk voor federaties en grote clubs om zelf sportconfiguraties te beheren.

## Past in TeamReel / CoreApp

- **TeamReel**: Essentieel voor groei. Voetbal is de start, maar hockey, volleybal, handbal, basketbal — elk met eigen posities en formaties — zijn de uitbreiding. De sport config UI maakt TeamReel klaar voor multisport zonder code-wijzigingen per sport.
- **CoreApp**: Sport configuration is TeamReel-specifiek, maar het pattern (configurable entity types met custom fields) is toepasbaar op elke domein-configuratie interface.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=F33-sport-configuration-ui

We bouwen een sport configuration interface in React 18 + TypeScript met Django 5 backend uitbreiding.

[feature summary]
Admin UI voor sport configuratie (posities, formaties, template koppelingen) bovenop de bestaande sport_configuration app.

[goals]
- Overzichtspagina /settings/sports: alle sporten met status, team count, toggle actief/inactief
- Sport detail editor /settings/sports/:id: posities beheren, formaties beheren
- Formatie visualisatie: visuele weergave van posities op een veld
- Content template koppeling per sport: welke templates beschikbaar zijn
- Backend ViewSets: CRUD voor Sport, Position, Formation (org-scoped)
- Seed command: seed_sport_config voor standaard sporten (voetbal, hockey, volleybal)

[non-goals]
- Drag & drop formatie editor (v1: dropdown/grid, drag-drop later)
- Tactiek/strategie analyzer
- Live match tracking

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Bestaande app: src/sport_configuration/ (5 models, geen ViewSets)
- Frontend: React 18, TypeScript, CSS Modules
- Branding: src/branding/ voor sport-specifieke assets
- Content: src/generative/ voor template koppeling
- Tests: pytest (backend), Playwright (frontend flows)
```

### Plan

```
/spec-kitty.plan feature=F33-sport-configuration-ui

[tech choices]
- Backend: DRF ModelViewSets voor Sport, Position, Formation
- Serializers: nested serializers (Sport → Positions, Formation → Positions)
- Org-scoped: federaties beheren eigen configs
- Frontend: React pages + components met react-query voor data fetching
- Formatie visualisatie: SVG-based veld met gepositioneerde markers
- Seed: Django management command seed_sport_config

[backend uitbreiding]
- src/sport_configuration/serializers.py — DRF serializers
- src/sport_configuration/views.py — ModelViewSets
- src/sport_configuration/urls.py — URL routing
- src/sport_configuration/management/commands/seed_sport_config.py

[frontend pagina's]
- demo/src/pages/SportConfigList.tsx — overzicht
- demo/src/pages/SportConfigDetail.tsx — detail/editor
- demo/src/components/sport/PositionEditor.tsx — posities beheren
- demo/src/components/sport/FormationPreview.tsx — SVG formatie visualisatie
```

### Research

```
/spec-kitty.research feature=F33-sport-configuration-ui

Onderzoek de volgende punten:

1. Welke models bestaan er in src/sport_configuration/? Lees models.py volledig.
2. Zijn er al ViewSets, serializers of URLs voor de sport_configuration app?
3. Hoe worden sporten en posities nu gebruikt in andere delen van de codebase?
4. Welke standaard formaties moeten er voor voetbal, hockey en volleybal beschikbaar zijn?
5. Hoe worden formatie-posities opgeslagen? (JSON grid, x/y coördinaten, enum?)
```
