# Frontend Refactoring Phases — Master Plan

**Status:** Actief
**Gestart:** 2025-Q4
**Laatste update:** 2026-03-02
**Doel:** Schaalbaar, toekomstbestendig design system voor premium mobile + desktop webapp

---

## Overzicht

Dit document beschrijft alle voltooide en geplande refactoring-fasen van de TeamReel frontend (`demo/src/`). Het doel is niet alleen "bestanden kleiner maken" maar een architectuur bouwen die:

1. **Schaalbaar** — Nieuwe features toevoegen zonder bestaande code te breken
2. **Herbruikbaar** — UI primitives die overal consistent werken
3. **Premium UX** — Mobile-first, responsive, gepolijste interacties
4. **Themeable** — Club-specifieke branding via tokens, niet hardcoded kleuren
5. **Onderhoudbaar** — Elk bestand < 500 regels, duidelijke verantwoordelijkheid

---

## Huidige Staat (2026-03-02)

| Metric | Waarde | Doel |
|--------|--------|------|
| Totaal bestanden (demo/src) | 373 | — |
| Totaal regels (demo/src) | 114.130 | — |
| Bestanden >1500 regels | **3** | **0** |
| Bestanden >1000 regels | **23** | **0** |
| Bestanden >500 regels | **61** | **< 20** |
| CSS custom properties (tokens) | 18 | 100+ |
| Utility CSS classes | 130 | 200+ |
| CSS Modules | 5 | 30+ |
| Remaining inline `style={{}}` | ~3300 | **0** |
| UI Primitives (`components/ui/`) | **0** | 15+ |
| Custom hooks | 53 | — |
| Lazy-loaded routes | 30+ | — |
| **packages/ code (gebouwd, deels ongebruikt)** | **41.164 regels** | **Integreren of archiveren** |

---

## Bestaande Frontend Packages (`packages/`)

Er zijn **9 packages** al gebouwd in `packages/` (samen 41K+ regels code, 321 bestanden). Deze corresponderen met de F-modules uit de roadmap (F01-F10, status: done). **De meeste zijn nauwelijks geïntegreerd in de demo webapp.**

### Integratie-audit (2026-03-02)

| Package | Module | Regels | Bestanden | Imports in demo | Status |
|---------|--------|--------|-----------|-----------------|--------|
| `@django-core/design-system` | F01 | 12.354 | 105 | **157** | ✅ Meest gebruikt — tokens, Button, Input, ThemeProvider |
| `@django-core/page-templates` | F06 | 5.231 | 33 | **56** | ⚠️ Deels gebruikt — layouts, maar niet alle templates |
| `@django-core/auth-ui` | F02 | 3.855 | 29 | **46** | ⚠️ Deels gebruikt — login/logout, maar niet password reset |
| `@django-core/context-switcher` | F03 | 2.809 | 21 | **44** | ⚠️ Deels gebruikt — org switcher, maar niet alle features |
| `@django-core/theme-system` | F07 | 2.241 | 27 | **7** | ❌ Nauwelijks gebruikt — ThemeProvider en ThemeToggle alleen |
| `@django-core/api-client` | — | 295 | 6 | **6** | ❌ Nauwelijks gebruikt — demo gebruikt eigen fetch wrappers |
| `@django-core/notifications-hub` | F04 | 8.947 | 56 | **1** | ❌ Niet gebruikt — ToastHost, NotificationPanel, UnreadBadge ongebruikt |
| `@django-core/permissions` | F08/B08 | 2.822 | 24 | **1** | ❌ Niet gebruikt — PermissionProvider, usePermissions ongebruikt |
| `@django-core/resource-alerts` | F05 | 2.611 | 20 | **0** | ❌ Niet gebruikt — Alert, Badge, ResourceUsageBar, HealthStatus ongebruikt |

**Totaal ongebruikt potentieel: ~17.000 regels** aan al-gebouwde componenten die niet of nauwelijks in de webapp zitten.

### Beslissing nodig per package

| Package | Aanbeveling | Reden |
|---------|-------------|-------|
| `design-system` | **Dieper integreren** | Al meest gebruikt, maar demo heeft eigen Button/Modal/Card patronen die naar DS primitives moeten migreren |
| `page-templates` | **Dieper integreren** | Dashboard, List-Detail, Wizard, Settings templates — de demo bouwt dit nu zelf per pagina |
| `auth-ui` | **Dieper integreren** | Password reset, profile management features ongebruikt |
| `context-switcher` | **Dieper integreren** | Keyboard shortcut (Cmd+K), recent history, zoek-features ongebruikt |
| `theme-system` | **Integreren of mergen met design-system** | Aparte ThemeProvider terwijl DS er ook een heeft — dedup nodig |
| `api-client` | **Vervangen of adopteren** | Demo gebruikt eigen fetch wrappers in adapters/ — kies één pad |
| `notifications-hub` | **Integreren** | 8.9K regels met Toast, NotificationPanel, UnreadBadge — demo mist deze features |
| `permissions` | **Integreren** | RBAC UI checks (PermissionGate, usePermissions) — demo doet nu geen frontend permissie-checks |
| `resource-alerts` | **Integreren** | Alert, Badge, ResourceUsageBar — demo herbouwt deze patronen inline |

---

## Voltooide Fasen (1-23)

### Track A: Design Token Foundation (Phase 1-2b)

| Phase | Wat | Resultaat |
|-------|-----|-----------|
| **1** | Unified token system met TeamReel brand | 18 CSS custom properties, dark mode basis |
| **2a** | Utility CSS classes + eerste inline style conversie | 130 utility classes, ~2000 inline styles → className (3 batches, 113 bestanden) |
| **2b** | CSS Modules voor 5 zwaarste componenten | Component-scoped styling voor AssetCard, IdentityTab, etc. |

### Track B: Page Decomposition (Phase 3-23)

| Phase | Bestand | Regels voor → na | Reductie |
|-------|---------|-------------------|----------|
| **3a-3b** | ProjectSeasonDetailPage | 4914 → 1530 | -69% |
| **4** | ProjectSeasonMemberDetailPage | 3998 → 1375 | -66% |
| **5** | ProjectCompetitionDetailPage | 2259 → 1182 | -48% |
| **6** | OrganisationDetailPage (ronde 1) | 2541 → 1933 | -24% |
| **7** | ClubOrganisationDetailPage (ronde 1) | 1981 → 1590 | -20% |
| **8** | OrganisationDetailPage (deep) | 1933 → 311 | -84% |
| **10** | PreferencesPage | 2309 → 896 | -61% |
| **18** | ClubOrganisationDetailPage (deep) | 1590 → 303 | -81% |
| **19** | App.tsx (routing) | 1597 → 103 | -94% |
| **20** | AssetGenerationModal | 1532 → 990 | -35% |
| **21** | useOrgData.ts | 1642 → 1208 | -26% |
| **22** | useMatchDetailData.ts | 1606 → 1328 | -17% |
| **23** | AssetsTab.tsx | 1531 → 713 | -53% |

**Patroon:** Extract types → helpers → custom hook → sub-components → thin JSX shell

---

## Geplande Fasen (24+)

### Track B (vervolg): Remaining Decomposition

**Doel:** Alle bestanden onder 500 regels brengen.

#### Tier 1: >1400 regels (hoge prioriteit)

| Phase | Bestand | Regels | Aanpak |
|-------|---------|--------|--------|
| **24** | UsersList.tsx | 1540 | Extract filters hook, user card component, bulk actions |
| **25** | ProjectSeasonDetailPage.tsx | 1530 | Verder splitsen: tabs die nog inline zijn → eigen bestanden |
| **26** | MatchCreateModal.tsx | 1510 | Extract wizard steps, validation, API calls |
| **27** | useContentGeneration.tsx | 1452 | Extract types, step logic, API helpers |
| **28** | ContentLibraryPage.tsx | 1440 | Extract filter panel, content cards, batch actions |
| **29** | TeamOrganisationDetailPage.tsx | 1439 | Extract tabs, modals, data hook |
| **30** | ApprovalsPage.tsx | 1413 | Extract approval card, filter logic, batch actions |

#### Tier 2: 1000-1400 regels

| Phase | Bestand | Regels | Aanpak |
|-------|---------|--------|--------|
| **31** | ProjectSeasonMemberDetailPage.tsx | 1375 | Verder splitsen (was 3998, nu 1375) |
| **32** | UserEditModal.tsx | 1333 | Extract form sections, validation |
| **33** | Breadcrumbs.tsx | 1264 | Extract route-config, breadcrumb resolvers |
| **34** | UserDetailPage.tsx | 1232 | Extract detail tabs, data hook |
| **35** | BatchGenerationModal.tsx | 1216 | Extract steps, preview, queue logic |
| **36** | CreditsPage.tsx + UsersPage.tsx | 1208 + 1200 | Extract tables, filters, charts |
| **37** | ProjectCompetitionDetailPage.tsx | 1182 | Verder splitsen (was 2259, nu 1182) |
| **38** | ConfirmStep.tsx | 1164 | Extract preview sections, parameter forms |
| **39** | usePreferencesData.tsx | 1082 | Extract types, section configs |
| **40** | EntityEditModal.tsx + useSidebarData | 1078 + 1058 | Extract form fields, menu builders |
| **41** | ProjectSeasonSquadPage.tsx | 1020 | Extract squad grid, member cards |
| **42** | AssetGenerationModal.tsx | 990 | Verder splitsen (was 1532, nu 990) |

**Geschatte effort:** ~3 bestanden per sessie = ~7 sessies voor Tier 1+2

---

### Track G: Package Integration (NIEUW — start na Phase 26)

**Doel:** De 41K+ regels aan al-gebouwde packages daadwerkelijk integreren in de demo webapp, in plaats van dezelfde functionaliteit opnieuw inline te bouwen.

**Principe:** *Adopt before you build.* Voordat we nieuwe UI primitives maken in Track C, kijken we eerst of het al bestaat in `packages/`.

#### Fase G1: Theme & Token Unificatie

**Focus:** `@django-core/theme-system` (7 imports) + `@django-core/design-system` tokens

| Taak | Wat |
|------|-----|
| G1.1 | Audit: vergelijk DS tokens vs theme-system tokens — overlap/conflicten in kaart |
| G1.2 | Kies één ThemeProvider (DS of theme-system) en migreer |
| G1.3 | Activeer `ThemeToggle` + `useTheme` vanuit het gekozen package |
| G1.4 | BrandConfig integreren: clubkleuren → dynamische theme tokens |
| G1.5 | Verwijder inline kleur-hardcoding in demo die nu door tokens gedekt wordt |

#### Fase G2: API Client Adoptie

**Focus:** `@django-core/api-client` (6 imports) vs `demo/src/adapters/`

| Taak | Wat |
|------|-----|
| G2.1 | Vergelijk api-client features vs demo's eigen fetch wrappers |
| G2.2 | **Keuze:** api-client als basis adopteren OF demo's adapters verrijken en api-client deprecaten |
| G2.3 | CSRF handling unificeren — `getCsrfToken()` + `normalizeError()` op één plek |
| G2.4 | Migreer adapters die handmatig `fetch()` doen |

#### Fase G3: Notifications & Feedback

**Focus:** `@django-core/notifications-hub` (1 import — 8.9K regels ongebruikt!)

| Taak | Wat |
|------|-----|
| G3.1 | Activeer `ToastHost` in de app root — vervangt inline toast patronen |
| G3.2 | Activeer `NotificationPanel` + `UnreadBadge` in de sidebar/header |
| G3.3 | `ErrorBoundary` van notifications-hub integreren als globale error catcher |
| G3.4 | `NotificationBell` + real-time notificaties indien backend WebSocket/SSE heeft |

#### Fase G4: Permissions & Access Control

**Focus:** `@django-core/permissions` (1 import — 2.8K regels ongebruikt!)

| Taak | Wat |
|------|-----|
| G4.1 | `PermissionsProvider` in de app root zetten |
| G4.2 | `usePermissions` hook adopteren in pages met role-based content |
| G4.3 | `PermissionGate` component gebruiken voor conditionele UI (buttons, menu items) |
| G4.4 | Admin/manager/member visibility rules implementeren |

#### Fase G5: Resource Alerts & Status UI

**Focus:** `@django-core/resource-alerts` (0 imports — volledig ongebruikt!)

| Taak | Wat |
|------|-----|
| G5.1 | `Alert` component adopteren — vervangt inline waarschuwingsbanners |
| G5.2 | `Badge` component adopteren — vervangt herhaalde inline badge patronen |
| G5.3 | `ResourceUsageBar` integreren — credits pagina, storage usage |
| G5.4 | `HealthStatus` integreren — system status indicators |

#### Fase G6: Deeper Design System Adoption

**Focus:** `@django-core/design-system` (157 imports maar demo heeft ook eigen Button/Input/Card)

| Taak | Wat |
|------|-----|
| G6.1 | Audit: welke DS exports worden NIET gebruikt in demo (Button variants, Input sizes, etc.) |
| G6.2 | Vervang demo's eigen `<button className={s.btnPrimary}>` patronen door DS `<Button>` |
| G6.3 | Vervang demo's eigen form elements door DS `<Input>`, `<Textarea>`, `<Select>` |
| G6.4 | DS token export als single source of truth voor alle CSS custom properties |

#### Fase G7: Page Templates Deepening

**Focus:** `@django-core/page-templates` (56 imports maar meer templates beschikbaar)

| Taak | Wat |
|------|-----|
| G7.1 | Inventariseer ongebruikte templates (Wizard, Settings, etc.) |
| G7.2 | Migreer handgemaakte page layouts naar template components |
| G7.3 | Consistency check: alle pages gebruiken een template |

---

### Track C: UI Primitives Library (na Track G audit)

**Doel:** `demo/src/components/ui/` met herbruikbare atomic components.

> **⚠️ Adopt before you build!** Na Track G zijn veel primitives al beschikbaar via packages. Track C bouwt alleen wat nog NIET gedekt wordt door packages.

#### Pre-check per primitive

Voordat een nieuwe primitive gebouwd wordt:
1. Check of het in `@django-core/design-system` zit → **gebruik het**
2. Check of het in `@django-core/resource-alerts` of `notifications-hub` zit → **gebruik het**
3. Check of de demo een patroon >3x herhaalt dat NIET in packages zit → **extract as primitive**

#### Fase C1: Primitives die NIET in packages zitten

| Component | Bron (nu herhaald in) | Props |
|-----------|----------------------|-------|
| `IconButton` | History buttons, close buttons, action buttons | `icon`, `variant`, `size`, `tooltip` |
| `Card` | AssetCard, MetricCard, UserCard, ContentCard | `padding`, `variant`, `onClick` |
| `Modal` | 15+ modals met elk eigen overlay/panel/close pattern | `isOpen`, `onClose`, `title`, `size` |
| `Spinner` / `Skeleton` | Loading states overal | `size`, `variant` |
| `EmptyState` | "Geen resultaten" patronen | `icon`, `title`, `description`, `action` |
| `Avatar` | User/member foto's met fallback | `src`, `name`, `size` |
| `Tabs` | Tab navigatie op elke detail page | `items`, `activeId`, `onChange` |
| `DataTable` | UsersList, ContentLibrary, AuditLog | `columns`, `data`, `sort`, `pagination` |
| `SearchInput` | Search bars in elke list page | `value`, `onChange`, `placeholder` |

> **Button**, **Badge**, **Alert**, **Input**, **Textarea**, **Toast** → komen uit packages (Track G).

#### Fase C2: Layout Primitives

| Component | Doel |
|-----------|------|
| `Stack` | Vertical spacing (vervangt `flex-col gap-*` herhaling) |
| `Row` | Horizontal layout met alignment |
| `PageHeader` | Consistente page headers met breadcrumb + actions |
| `Section` | Consistente section containers (al geëxtraheerd in AssetsTab) |
| `SplitView` | Desktop: sidebar + main, Mobile: full-width |
| `ResponsiveGrid` | Auto-responsive grid met breakpoints |

#### Fase C3: Feedback Primitives (aanvulling op G3/G5)

| Component | Doel | Package? |
|-----------|------|----------|
| `ConfirmDialog` | Vervangt `window.confirm()` calls | Nee — nieuw |
| `ProgressBar` | Upload/generation progress | Nee — nieuw |

---

### Track D: Design Token Scale (parallel met C)

**Doel:** Van 18 → 100+ tokens, uitbreiden tot een compleet systeem.

#### D1: Color Token Scale

```css
/* Nu: 18 losse variabelen */
/* Doel: Systematische schaal */
--color-primary-50: ...;   /* lightest */
--color-primary-100: ...;
--color-primary-500: ...;  /* default */
--color-primary-900: ...;  /* darkest */

/* Semantic tokens */
--color-bg-primary: var(--color-neutral-900);
--color-bg-secondary: var(--color-neutral-800);
--color-bg-surface: var(--color-neutral-850);
--color-text-primary: var(--color-neutral-100);
--color-text-secondary: var(--color-neutral-400);
--color-border-default: var(--color-neutral-700);

/* Status tokens */
--color-success: var(--color-green-500);
--color-warning: var(--color-amber-500);
--color-error: var(--color-red-500);
--color-info: var(--color-blue-500);
```

#### D2: Spacing + Typography Scale

```css
/* Spacing: 4px base unit */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;

/* Typography scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */

/* Font weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### D3: Motion + Elevation

```css
/* Transitions */
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);

/* Elevation (shadows) */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
--shadow-md: 0 4px 6px rgba(0,0,0,0.25);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.3);

/* Border radius */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

#### D4: Responsive Breakpoints

```css
/* Breakpoints (als CSS container queries + media queries) */
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Wide desktop */
```

---

### Track E: Inline Style Elimination (parallel)

**Doel:** ~3300 → 0 inline styles.

| Fase | Focus | Geschatte inline styles |
|------|-------|------------------------|
| E1 | Top 5 bestanden (DesignSystemPage, ConfirmStep, UserEditModal, index.tsx, AssetGenerationModal) | ~472 |
| E2 | Volgende 10 bestanden | ~400 |
| E3 | Bulk: alle bestanden met <20 inline styles | ~600 |
| E4 | Overig | ~1800 |

**Methode:** Combineer met Track C — zodra een UI primitive gebouwd is, vervang inline styles door primitive props.

---

### Track F: Mobile-First Polish (na Track C+D)

**Doel:** Premium mobile ervaring, niet alleen "het werkt op mobiel".

| Fase | Wat |
|------|-----|
| F1 | Touch targets: alle interactieve elementen ≥ 44x44px |
| F2 | Safe area uitbreiding: notch/dynamic island handling |
| F3 | Gesture support: swipe-to-dismiss modals, pull-to-refresh |
| F4 | Responsive containers: component-level responsive (niet alleen media queries) |
| F5 | Mobile navigation: bottom sheet patterns, haptic feedback hooks |
| F6 | Offline indicators + optimistic UI |

---

## Aanbevolen Volgorde

```
Fase 24-26:  Track B — Decompose top 3 (UsersList, SeasonDetail, MatchCreateModal)
Fase 27:     Track G1 — Theme & Token unificatie (DS vs theme-system)
Fase 28:     Track G2 — API Client adoptie (api-client vs adapters/)
Fase 29:     Track G3 — Notifications-hub integreren (Toast, NotificationPanel, ErrorBoundary)
Fase 30:     Track G4 — Permissions integreren (PermissionGate, usePermissions)
Fase 31:     Track G5 — Resource-alerts integreren (Alert, Badge, ResourceUsageBar)
Fase 32:     Track G6 — Design System deepening (Button, Input, Textarea migratie)
Fase 33:     Track C1 + D1 — Resterende UI primitives (Modal, Card, DataTable) + Color tokens
Fase 34-36:  Track B — Decompose Tier 2 bestanden + gebruik nieuwe primitives/packages
Fase 37-38:  Track C2 + D2 — Layout primitives + Spacing/Typography tokens
Fase 39-41:  Track B — Decompose remaining + Track E (inline style sweep)
Fase 42-43:  Track C3 + D3 — Feedback primitives + Motion/Elevation tokens
Fase 44-46:  Track B — Final decomposition + Track G7 (Page Templates deepening)
Fase 47+:    Track F — Mobile polish
```

**Kruisbestuiving:** Elke decomposition-sessie is ook een kans om herhalende patronen te spotten. Package adoptie (Track G) gaat vóór nieuwe primitives bouwen (Track C) — *adopt before you build*.

**Totale effort schatting:**
- Track B (decomposition): ~7 sessies
- Track G (package adoptie): ~6 sessies
- Track C+D (primitives + tokens): ~4 sessies
- Track E (inline style sweep): ~3 sessies
- Track F (mobile polish): ~3 sessies
- **Totaal: ~23 sessies**

---

## Definition of Done (per phase)

- [ ] `npx tsc --noEmit` — geen TypeScript errors
- [ ] `npx vite build` — productie build slaagt
- [ ] Geen bestand > target regellimiet
- [ ] Gecommit + pushed naar `main`
- [ ] Dit document bijgewerkt met resultaten

## Definition of Done (gehele refactoring)

- [ ] Geen bestand > 500 regels (excl. constants/config)
- [ ] `components/ui/` bevat 15+ herbruikbare primitives
- [ ] Alle 9 packages actief geïntegreerd (≥10 imports per package OF bewust gedeprecate)
- [ ] `@django-core/resource-alerts` geïntegreerd (was: 0 imports)
- [ ] `@django-core/notifications-hub` geïntegreerd (was: 1 import)
- [ ] `@django-core/permissions` geïntegreerd (was: 1 import)
- [ ] Inline `style={{}}` count: 0 (was: ~3300)
- [ ] 100+ CSS custom properties / design tokens
- [ ] Eén ThemeProvider (geen dubbele DS + theme-system)
- [ ] Eén API client layer (geen dubbele api-client + adapters/)
- [ ] Mobile touch targets ≥ 44x44px op alle interactieve elementen
- [ ] 100+ design tokens (kleuren, spacing, typography, motion)
- [ ] 0 inline `style={{}}` statements
- [ ] 30+ CSS Modules voor component-specifieke styling
- [ ] Mobile-first: alle touch targets ≥ 44px, gestures, responsive containers
- [ ] Storybook/DesignSystemPage toont alle primitives met varianten
