# TeamReel Roadmap

## Bouwvolgorde

> Mappen zijn genummerd op **bouwvolgorde** — map 01 wordt het eerst gebouwd.
> Volledige details per item: zie [`_priority-queue.md`](backlog/_priority-queue.md)

| Map | Focus | Items | Effort |
|-----|-------|-------|--------|
| `01-content-pipeline` | Content pipeline refactoring | 3 | ~65u |
| `02-infra-tooling` | Refactoring, cleanup, AI tooling | 7 | ~124u |
| `03-admin-analytics` | Admin dashboards, monitoring | 6 | ~150u |
| `04-club-experience` | Leden, onboarding, goedkeuring | 7 | ~170u |
| `05-social-publishing` | Delen, publiceren, bereik | 3 | ~85u |
| `06-automation` | Match day triggers, scraping, planning | 4 | ~120u |
| `07-commerce` | Abonnementen, betaling, marketplace | 4 | ~135u |
| `08-platform-scaling` | Push notifications, whitelabel, i18n | 4 | ~150u |

**Totaal: 38 items · ~870 uur · 7 in review · 2 afgerond**

## Structuur

```
backlog/
├── _priority-queue.md           ← MASTER BOUWVOLGORDE (begin hier)
├── 01-content-pipeline/         ← Video/media generatie & verwerking
├── 02-infra-tooling/            ← Refactoring, cleanup, AI tooling
├── 03-admin-analytics/          ← Dashboard, monitoring, analytics
├── 04-club-experience/          ← Ledenportaal, onboarding, sponsor
├── 05-social-publishing/        ← Delen, publiceren, public feed
├── 06-automation/               ← Match day automation, calendar, scraping
├── 07-commerce/                 ← Betaling, abonnementen, marketplace
└── 08-platform-scaling/         ← Whitelabel, multi-taal, PWA

archive/                         ← Afgerond werk
icebox/                          ← Verre toekomst (5 items geparkeerd)
```

## Per themamap

Elke map heeft:
- `_phase.md` — doel, scope, bouwvolgorde binnen de map
- `todo/` — klaar om opgepakt te worden (items genummerd op volgorde)
- `review/` — gebouwd, wacht op code review
- `done/` — afgerond en geverifieerd

## Module naamgeving

```
{volgnummer}-{prefix}-{naam}.md
```

Voorbeeld: `01-FULL-member-self-registration.md`

| Prefix | Laag |
|--------|------|
| `BE-` | Backend (Django/DRF) |
| `FE-` | Frontend (React/TS) |
| `FULL-` | Full-stack |
| `INFRA-` | Infrastructure/DevOps |
| `AI-` | AI/Generative |

Items kunnen een enkel `.md` bestand zijn (kleine features) of een folder met `index.md` + sub-fases (grote features).

## Agent workflow

| Agent | Pakt op uit | Levert af in |
|-------|-------------|-------------|
| **Planner** | — | `todo/` (specs schrijven) |
| **Bouwer** | `todo/` (laagste nummer eerst) | `review/` |
| **Reviewer** | `review/` | `done/` of terug naar `todo/` |

## Regels

- **Bouwer pakt altijd het laagste volgnummer** in `todo/`
- **Fase-volgorde**: map 01 eerst, dan 02, dan 03, etc.
- Bouwer verplaatst item van `todo/` → `review/` na implementatie
- Reviewer verplaatst naar `done/` of terug naar `todo/` met feedback
- Planner maakt nieuwe items aan in `todo/` van de juiste fase
- `_phase.md` in elke map beschrijft doel, scope en bouwvolgorde
