# Roadmap

## Structuur

```
02-roadmap/
├── modules/          ← HET werkende systeem (kanban)
│   ├── backlog/      ← gespecificeerd, nog niet gestart
│   ├── ready/        ← uitgewerkt met fases, klaar om te bouwen
│   ├── active/       ← nu bezig (max 1-2 tegelijk)
│   ├── done/         ← afgerond en geverifieerd
│   ├── quick/        ← kleine fixes (<4 uur)
│   └── later/        ← uitgesteld
│
├── fases/            ← strategische planning (fase 1-19)
│   ├── done/         ← fase 1-9 specs (afgerond)
│   └── planned/      ← fase 10-19 specs (toekomst)
│
├── archive/          ← historisch (niet meer actief)
│   └── iteraties/    ← 31 afgeronde frontend-roadmaps (Q4 2024 – Q1 2026)
│
├── index.md          ← dit bestand
└── roadmap.md        ← volledige build-volgorde
```

## Modules — Kanban

Dit is het **enige actieve systeem**. Alle werk wordt hier bijgehouden.

| Status | Map | Wat |
|--------|-----|-----|
| 📋 Backlog | [modules/backlog/](modules/backlog/) | Gespecificeerd, nog niet gestart |
| 📐 Ready | [modules/ready/](modules/ready/) | Uitgewerkt met fases, klaar om te bouwen |
| 🚧 Active | [modules/active/](modules/active/) | Er wordt nu aan gebouwd |
| ✅ Done | [modules/done/](modules/done/) | Afgerond en geverifieerd |
| ⚡ Quick | [modules/quick/](modules/quick/) | Kleine verbeteringen (<4 uur) |
| 🔜 Later | [modules/later/](modules/later/) | Uitgesteld naar later |

**Workflow:** `backlog/ → ready/ → active/ → done/`

### Module types

| Type | Naamgeving | Voorbeeld | Wanneer |
|------|-----------|-----------|---------|
| **Feature** | `NNN-Fxx-naam/` | `337-F25-club-hub/` | Nieuw scherm, grote feature, multi-fase |
| **Backend** | `NNN-Bxx-naam/` | `001-B01-core-project-skeleton.md` | API, model, service, infra |
| **Quick** | `Qxxx-naam.md` | `Q007-icon-buttons-touch-target.md` | Fix, verbetering, ≤4 uur |

### Feature-modules (fases)

Grote modules hebben een `phases/` structuur:

```
NNN-Fxx-naam/
├── index.md           ← spec + overzicht
└── phases/
    ├── todo/          ← nog te bouwen fases
    │   ├── H0_foundation.md
    │   └── H1_core-feature.md
    └── done/          ← afgeronde fases
        └── H2_polish.md
```

## Fases — Strategische Planning

De 19 delivery-fases groeperen modules in logische bouwblokken.

### Afgerond (fase 1-10)

| Fase | Naam | Modules |
|------|------|---------|
| 1 | [Foundation & Governance](fases/done/phase-01-foundation-and-governance.md) | 001-004 |
| 2 | [Identity & Multi-Tenancy](fases/done/phase-02-identity-and-multi-tenancy.md) | 005-008 |
| 3 | [Config, Audit & Transactions](fases/done/phase-03-configuration-audit-and-transactions.md) | 009-012 |
| 4 | [Interfaces & Communication](fases/done/phase-04-interfaces-and-communication.md) | 013-017 |
| 5 | [Operationalisation](fases/done/phase-05-operationalisation.md) | 018-021 |
| 6 | [Frontend Foundations](fases/done/phase-06-frontend-foundations.md) | 022-025 |
| 7 | [Frontend Resources & Integration](fases/done/phase-07-frontend-resources-and-integration.md) | 026-030 |
| 8 | [Demo Foundation](fases/done/phase-08-demo-foundation.md) | 031-033 |
| 9 | [Backend Infrastructure](fases/done/phase-09-backend-infrastructure.md) | 034-038 |
| 10 | Content Engine Core | 039-044 + accelerated 045-049 |

### Gepland (fase 11-19)

| Fase | Naam | Status |
|------|------|--------|
| 11 | [Frontend & Visual Dev](fases/planned/phase-11-frontend-and-visual-development.md) | 📋 |
| 12 | [Workflows & Payments](fases/planned/phase-12-workflows-and-payments.md) | 📋 |
| 13 | [Advanced UI](fases/planned/phase-13-advanced-ui.md) | 📋 |
| 14 | [Data Foundations Part 1](fases/planned/phase-14-data-foundations-part-1.md) | 📋 |
| 15 | [Data Foundations Part 2](fases/planned/phase-15-data-foundations-part-2.md) | 📋 |
| 16 | [ML/AI Platform](fases/planned/phase-16-ml-ai-platform.md) | 📋 |
| 17 | [Quality Gates](fases/planned/phase-17-platform-quality-gates.md) | 📋 |
| 18 | [Integration Ecosystem](fases/planned/phase-18-integration-ecosystem.md) | 📋 |
| 19 | [Operations & Resilience](fases/planned/phase-19-operations-and-resilience.md) | 📋 |

## Archive

| Map | Wat | Periode |
|-----|-----|---------|
| [archive/iteraties/](archive/iteraties/) | 31 afgeronde frontend/UX-roadmaps | Q4 2024 – Q1 2026 |

Dit waren sprint-achtige iteraties voor het modules-systeem. Allemaal afgerond. Zie [archive/iteraties/index.md](archive/iteraties/index.md) voor het overzicht.

## Links

- **[Volledige build-volgorde](roadmap.md)** — alle 83+ modules in volgorde
- **[Module documentatie](../04-modules/index.md)** — technische docs per module
- **[AI Context Index](../05-demo/ai-context-index.md)** — domeinkennis voor agents
