# N1 — navGroups & Dead Code Cleanup

**Status:** 🔲 Todo
**Track:** N — Navigation Surfaces
**Effort:** 2 uur
**Dependencies:** Geen (kan parallel met R1)

---

## Doel

Opschonen van ongebruikte navigatie-code in TopNavbar. `navGroups` is een leeg array maar het type-systeem, helper functies en rendering code bestaan nog. Beslis: vullen of verwijderen.

## Huidige Staat

### topNavbarHelpers.ts

```tsx
// Leeg array — mega-menu heeft geen items
export const navGroups: NavGroup[] = [];

// Types bestaan wel:
export interface NavGroup { id: string; label: string; items: NavItem[]; }
export interface NavItem { path: string; label: string; description?: string; icon?: LucideIcon; }

// Helper functies voor een mega-menu dat niet bestaat:
export function getColumnCount(itemCount: number): number { ... }
export function isItemActive(pathname: string, itemPath: string): boolean { ... }
export function isGroupActive(pathname: string, group: NavGroup): boolean { ... }
```

### TopNavbar component

Het TopNavbar component heeft waarschijnlijk rendering-code voor `navGroups.map(...)` die nooit items rendert (leeg array = geen output).

### Omvang dead code

- `navGroups` constant (1 regel)
- `NavGroup` interface (~4 regels)
- `NavItem` interface (~5 regels)
- `getColumnCount` functie (~5 regels)
- `isGroupActive` functie (~3 regels)
- `isItemActive` functie (~3 regels)
- TopNavbar mega-menu rendering (~20-40 regels vermoedelijk)
- **Totaal:** ~40-60 regels dead code

## Beslissing

### Optie A: Verwijder alles (aanbevolen)

De sidebar + MobileBottomNav vormen de primaire navigatie. Het mega-menu patroon is niet in het huidige design. Dead code verwijderen is cleaner.

**Als er later een mega-menu nodig is, is het snel opnieuw gebouwd met de route constants uit R1.**

### Optie B: Vul met werkende items

Maak het mega-menu functioneel. Vereist design-beslissing over welke groepen/items erin horen.

## Scope (Optie A — verwijder)

### 1. topNavbarHelpers.ts

- Verwijder `navGroups`, `NavGroup`, `NavItem`
- Verwijder `getColumnCount`, `isItemActive`, `isGroupActive`
- Behoud: `TopNavbarProps`, `NotificationResponse`, `CREATE_MENU_ITEMS`, `isPlatformRoute`, `checkIsNonAppRoute`, `PhotoCompositeFollowUpInfo`

### 2. TopNavbar component

- Verwijder mega-menu rendering code (navGroups.map, group triggers)
- Behoud: search, create menu, notifications, back-nav, mobile toggle

### 3. Audit andere imports

- Zoek of `navGroups`, `NavGroup`, `NavItem`, `getColumnCount`, `isGroupActive`, `isItemActive` ergens anders geïmporteerd worden
- Verwacht: waarschijnlijk alleen in TopNavbar

## Acties

1. [ ] Grep voor imports van `navGroups`, `NavGroup`, `NavItem`, `getColumnCount`, `isGroupActive`, `isItemActive`
2. [ ] Verwijder ongebruikte exports uit `topNavbarHelpers.ts`
3. [ ] Verwijder mega-menu rendering uit TopNavbar component
4. [ ] Verifieer geen broken imports
5. [ ] `tsc --noEmit` clean
6. [ ] `vitest run` all green

## Verificatie

- [ ] `navGroups` niet meer in codebase
- [ ] `getColumnCount` niet meer in codebase
- [ ] TopNavbar rendert geen lege mega-menu structuur meer
- [ ] Geen visuele regressie (mega-menu was al onzichtbaar)
- [ ] Gecommit + gepusht
