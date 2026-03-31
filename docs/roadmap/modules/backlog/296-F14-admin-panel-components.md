# 296 — F14 — Admin Panel Components

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Frontend (UI Components) |
| Impact | 🟡 important |
| Effort | ~25 uur |

## Wat

Herbruikbare admin panel componenten voor content management: AdminTable (sorteerbaar, filterable, bulk actions), AdminForm (auto-generated van TypeScript interfaces), AdminPanel layout met sidebar navigation, BulkActions voor multi-select operaties, en QuickFilters voor veelgebruikte queries.

## Waarom belangrijk

Django Admin is krachtig voor developers, maar niet geschikt voor clubbeheerders. Een React-based admin panel biedt een gebruiksvriendelijke interface voor het beheren van users, organisaties, projecten en content — zonder technische kennis. Bulk actions maken het efficiënt om 50+ items tegelijk te bewerken.

## Past in TeamReel / CoreApp

- **TeamReel**: Clubadmins moeten leden beheren, teams aanpassen, content goedkeuren, en sponsor-instellingen wijzigen. Een gebruiksvriendelijk admin panel is cruciaal voor adoptie.
- **CoreApp**: Admin panel components zijn herbruikbaar voor elk SaaS-product met data management. AdminTable + AdminForm zijn de basis van elke back-office interface.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=F14-admin-panel-components

We bouwen herbruikbare admin panel componenten voor de React 18 + TypeScript frontend.

[feature summary]
AdminTable, AdminForm, AdminPanel layout en BulkActions components voor content management interfaces.

[goals]
- AdminTable: sorteerbaar, filterable, paginatie, bulk actions, <200ms render bij 100+ items
- AdminForm: auto-generated van TypeScript interfaces, client-side validatie
- AdminPanel: layout met sidebar navigation, breadcrumbs
- BulkActions: multi-select met acties (delete, export, status change), <1s bij 50+ items
- QuickFilters: predefined filter presets
- Permission-aware: componenten respecteren user permissions (B08)

[non-goals]
- Vervanging van Django Admin (dat blijft voor developers)
- Low-code form builder
- Dashboard builder

[tech context]
- Frontend: React 18, TypeScript, Vite, CSS Modules
- Table: @tanstack/react-table v8 (headless)
- Forms: react-hook-form + zod validatie
- API: DRF endpoints met django-filter backends
- Auth: bestaande auth context (src/ auth systeem)
```

### Plan

```
/spec-kitty.plan feature=F14-admin-panel-components

[tech choices]
- Table: @tanstack/react-table met custom column definitions
- Forms: react-hook-form + zod schema's, auto-generate van TypeScript types
- Layout: CSS Grid met collapsible sidebar, breadcrumb trail
- State: React context voor sidebar collapse state
- Styling: CSS Modules met design tokens

[components to build]
- AdminPanel — layout wrapper (sidebar + header + content area)
- AdminTable — generic tabel met sorting, filtering, pagination, row selection
- AdminForm — form component met field auto-generation
- BulkActions — toolbar die verschijnt bij row selection
- QuickFilters — filter preset buttons boven tabel
- AdminBreadcrumbs — navigation breadcrumbs

[files to create]
- demo/src/components/admin/AdminPanel.tsx + .module.css
- demo/src/components/admin/AdminTable.tsx + .module.css
- demo/src/components/admin/AdminForm.tsx + .module.css
- demo/src/components/admin/BulkActions.tsx + .module.css
- demo/src/components/admin/QuickFilters.tsx + .module.css
- demo/src/types/admin.ts — TypeScript interfaces
```

### Research

```
/spec-kitty.research feature=F14-admin-panel-components

Onderzoek de volgende punten:

1. Welke admin/management pagina's bestaan er al in demo/src/? Welke pattern gebruiken ze?
2. Worden @tanstack/react-table en react-hook-form al gebruikt in het project?
3. Welke DRF ViewSets bestaan er? Welke ondersteunen filtering/pagination? (voor tabel-integratie)
4. Hoe werkt het bestaande permission systeem? Welke permission checks zijn er in de frontend?
5. Wat is het huidige routing-pattern in demo/src/? Hoe passen admin-routes daarin?
```
