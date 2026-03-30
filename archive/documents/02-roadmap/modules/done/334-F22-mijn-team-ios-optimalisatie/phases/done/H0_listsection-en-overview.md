# H0 — ListSection component + Overview tab redesign

> **Effort:** ~3.5 uur | **Impact:** Basis-component voor alle tabs + de belangrijkste tab volledig vernieuwd

## To do

### ListSection component

- [ ] `ListSection` component aanmaken (`demo/src/components/ListSection/`)
  - TSX + CSS Module + barrel export
  - Props: `title` (section header), `children` (ListSection.Row elementen)
  - Compound component pattern: `ListSection.Row`
- [ ] `ListSection.Row` sub-component:
  - Props: `icon?` (Lucide component), `label`, `value?`, `onTap?`, `status?` ('success' | 'warning'), `trailing?` (custom trailing element)
  - `ChevronRight` icon automatisch als `onTap` is meegegeven
  - `CheckCircle` / `AlertCircle` als `status` prop gezet
  - Touch target >= 44x44px
  - Divider tussen rows (`1px solid var(--border-default)`)
- [ ] CSS Module:
  - Rounded corners (`var(--radius-lg)`)
  - Section header: uppercase, `var(--text-xs)`, `var(--text-tertiary)`, `var(--space-*)` padding
  - Alle waarden via design tokens, geen hardcoded kleuren/spacing
  - `:focus-visible` op tappable rows
- [ ] Werkt op alle viewports (mobiel + desktop)

### Asset-status helper

- [ ] `getMemberAssetStatus()` utility functie:
  - Input: `Participation` (met `metadata.teamreel_assets`)
  - Output: `{ status: 'complete' | 'partial' | 'empty', filled: number, total: 5 }`
  - Checkt 5 slots: profile, fullbody, closeup, intro, celebration
- [ ] `getClubAssetStatus()` en `getTeamAssetStatus()` helpers:
  - Checken of logo, kits, sponsor etc. aanwezig zijn
  - Return `'complete' | 'incomplete'`

### Overview tab redesign

- [ ] "Volgende Wedstrijd" hero card sectie:
  - Datum, tegenstander, locatie (met `Calendar`, `MapPin` icons)
  - "Opstelling" tappable link met `ChevronRight`
  - Verbergen als geen komende wedstrijd
- [ ] "Seizoen" stats sectie (ListSection):
  - Wedstrijden (count / totaal), Selectie (count), Content (count)
  - Elke row tappable -> navigeert naar betreffende tab
- [ ] "Assets" status sectie (ListSection):
  - Club assets, Team assets, Ledenfoto's
  - `CheckCircle` (--text-success) of `AlertCircle` (--text-warning) per row
  - Tappable -> navigeert naar asset-beheer pagina
- [ ] "Beheer" sectie (ListSection, admin-only):
  - Team instellingen, Brand profiel, Competities, Kits & Tenues, Assets uploaden
  - Elke row navigeert naar bestaande detail-pagina
  - Altijd zichtbaar (niet ingeklapt)
- [ ] RBAC: Players/Supporters zien Wedstrijd + Seizoen + Assets, geen Beheer
- [ ] Content Streak widget verwijderen van Overview tab

## Done criteria

- [ ] `ListSection` importeerbaar en herbruikbaar: `import { ListSection } from '@/components/ListSection'`
- [ ] Overview tab toont 4 grouped sections: Wedstrijd hero, Seizoen stats, Assets, Beheer
- [ ] Alle ListSection rows zijn tappable naar de juiste bestemmingen
- [ ] Asset-status indicators (`CheckCircle`/`AlertCircle`) tonen correcte status
- [ ] Beheer-sectie alleen zichtbaar voor admins, altijd open (niet ingeklapt)
- [ ] Content Streak widget niet meer zichtbaar op Overview
- [ ] Touch targets >= 44x44px, `:focus-visible` op interactieve elementen
- [ ] Design tokens only, TypeScript strict, geen `any`
- [ ] `npx tsc --noEmit` + `npx vite build` slagen
