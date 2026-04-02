# H5 — MemberSummarySheet: lid-preview in NavigationSheet

> **Effort:** ~3 uur | **Impact:** Ledendetail in-page — assets en info zonder hub te verlaten

## Doel

Tap op een lid in Selectie-tab of Media-tab opent een `NavigationSheet` met een read-only lid-overzicht. Gebruiker ziet naam, rol, avatar en asset-status. Geen edit-acties in de sheet — bewerken gebeurt op de volledige MemberDetailPage.

## Patroon

Zelfde `NavigationSheet` wrapper als H4. De < > navigatie zit **niet** in de NavigationSheet header (die ondersteunt alleen title + close/back), maar als eerste element in de body — consistent met hoe `MemberDetailPanel` een eigen nav-header bouwt.

Assets zijn zichtbaar voor **alle rollen** (admin, player, supporter). De sheet is read-only — iedereen kan zien welke assets er zijn. Bewerken gebeurt via "Bekijk profiel" dat het bestaande `MemberDetailPanel` (slide-in panel met tabs) opent.

Later uitbreidbaar met child-sheets (iOS drill-down via `onBack`).

## Nieuw component: `MemberSummarySheet`

Locatie: `demo/src/pages/identity/MemberSummarySheet.tsx` + `.module.css`

### Props

```tsx
interface MemberSummarySheetProps {
  member: SquadMember | null;
  isOpen: boolean;
  onClose: () => void;
  memberDetailPath: string;  // voor "Bekijk profiel" link
  isAdmin?: boolean;
  /** < > navigation between members */
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}
```

### Content layout

NavigationSheet `title` = "Selectie" (vaste tekst). De member-specifieke header met < > navigatie zit in de body:

```
+----------------------------------+
|  [×] Selectie                    |  <-- NavigationSheet header (vast)
+----------------------------------+
|  [<]  3 / 18  [>]               |  <-- Nav bar in body (zoals MemberDetailPanel)
|                                  |
|         [  Avatar (lg)  ]        |  <-- Grote avatar
|         Jan de Vries             |  <-- Naam
|         Speler                   |  <-- Rol
|                                  |
+- ASSETS ------------------------+
| [Check] Portretfoto             |  <-- asset slot status
| [Check] Fullbody                |
| [  —  ] Close-up                |  <-- ontbreekt
| [  —  ] Intro video             |
| [Check] Celebration video       |
+----------------------------------+
|                                  |
|  3 van 5 assets compleet         |  <-- Samenvatting
|                                  |
+- ACTIES ------------------------+
| [ Bekijk profiel            > ] |  <-- → opent MemberDetailPanel
+----------------------------------+
```

### Data

Uit bestaande `SquadMember`:
- `m.user.first_name`, `m.user.last_name` — naam
- `m.user.avatar_url` — avatar
- `m.role` / `m.functional_roles` — rol/positie
- `getMemberAssetStatus(m)` — asset-status (bestaande helper)
- `getMemberSlotPresence(m)` — per-slot status (bestaande helper)

### < > Navigatie

Zoals `MemberDetailPanel`: pijltjestoetsen links/rechts of tap op < > knoppen om door leden te bladeren zonder sheet te sluiten. Props `onPrev`/`onNext` + `hasPrev`/`hasNext`.

Counter (`3 / 18`) toont huidige index + totaal — zelfde `navCounter` styling als MemberDetailPanel.

### Crossfade bij member-wissel

Bij < > navigatie: subtiele crossfade transition (150ms opacity) op de body content zodat de wissel vloeiend is. Geen harde "knip".

```css
.memberContent {
  transition: opacity 150ms ease;
}
.memberContent[data-switching='true'] {
  opacity: 0;
}
```

### Gedrag

- Sheet opent met `NavigationSheet` animatie
- < > knoppen wisselen het lid in de sheet (geen re-open) met crossfade
- "Bekijk profiel" → sluit sheet + opent `MemberDetailPanel` (bestaand slide-in panel met tabs Assets/Intro/Celebration/Actiefoto)
- Asset-rijen tonen Check (aanwezig, success) of — (ontbreekt, muted)
- Assets zichtbaar voor **alle rollen** (read-only) — speler/supporter ziet wat er is, admin ziet wat er mist
- Geen edit-acties in de sheet — read-only preview
- Keyboard: pijltjes links/rechts, Escape = sluiten
- Haptic, history state, swipe-to-dismiss: via NavigationSheet (H4 infra-upgrade)

## Checklist

- [x] `MemberSummarySheet` component aanmaken
- [x] CSS module met design tokens
- [x] Avatar hero + naam + rol
- [x] Asset-slot lijst met Check/ontbreekt status (hergebruik `getMemberSlotPresence`)
- [x] Asset-samenvatting (X van 5 compleet)
- [x] Assets zichtbaar voor alle rollen (niet alleen admin)
- [x] < > navigatie in body (nav bar boven avatar, zoals MemberDetailPanel)
- [x] Counter weergave (`3 / 18`) in nav bar
- [x] Crossfade transition (150ms) bij member-wissel
- [x] "Bekijk profiel" action knop → sluit sheet + navigeert naar member detail
- [x] `NavigationSheet` wrapping (title="Selectie")
- [x] Keyboard navigatie (pijltjes + Escape)
- [x] TypeScript strict, geen `any`
- [ ] Touch targets >= 44x44px
