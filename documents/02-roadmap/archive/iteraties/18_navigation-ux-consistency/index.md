# Roadmap #18 — Navigation & UX Consistency

> **Status:** ✅ Klaar (7/7 fases)
> **Start:** 2026-03-13
> **Scope:** `demo/src/` — navigatie, interactiepatronen, bottom bar, dark theme

---

## Doel

Consistente mobiel-first navigatie-ervaring: alle profile-acties als inline sheets (niet page navigations), desktop/mobile unificatie, bottom bar optimalisatie, en polish (dark theme FOUC, transitions).

---

## Fases

| Fase | Titel | Status | Beschrijving |
|------|-------|--------|--------------|
| **N0** | Dark Theme FOUC Fix | ✅ Klaar | Inline critical CSS + theme-color meta in `index.html` — elimineer flash van lichte content bij page refresh |
| **N1** | ProfileHub Sheet-ificatie | ✅ Klaar | Credits, Notifications, Memberships → inline sheets ipv page navigations |
| **N2** | Desktop/Mobile Profile Unificatie | ✅ Klaar | Eén profile-ervaring: avatar dropdown + `/preferences` → redirect naar `/profile` |
| **N3** | Bottom Bar Heroverweging | ✅ Klaar | Gallery → Studio, Season → My Team (stabiel label), fallback naar directory |
| **N4** | Settings Navigatie Cleanup | ✅ Klaar | SettingsLandingPage link fix, `/billing` redirect naar `/profile` |
| **N5** | Sheet Component Systeem | ✅ Klaar | Universele `<NavigationSheet>` component — focus trap, scroll lock, open/close animaties, prefers-reduced-motion |
| **N6** | Navigatie Transitions & Polish | ✅ Klaar | Close animaties, `prefers-reduced-motion` support, MobileBottomNav polish |

---

## Analyse (pre-roadmap)

### Huidige problemen

1. **Mixed interaction patterns in Profile:**
   - Edit Profile → Modal (goed)
   - Credits → Full page navigation (breekt context)
   - Notifications → Full page navigation (breekt context)
   - Memberships → Full page navigation (breekt context)

2. **Desktop/Mobile divergentie:**
   - Mobiel: Bottom nav → `/profile` (ProfileHubPage)
   - Desktop: Avatar dropdown → `/preferences?tab=profile` (PreferencesPage)
   - Twee compleet verschillende pagina's voor dezelfde functionaliteit

3. **Bottom bar vragen:**
   - Season tab: dynamisch label/pad, verwarrend zonder context
   - Gallery vs Studio naamgeving
   - Geen directe match-toegang

4. **Dark Theme FOUC:**
   - CSS geladen via JS modules → gap tussen `data-theme="dark"` en CSS load
   - ✅ Opgelost in N0 met inline `<style>` block

### Bestaande sheet-patronen (herbruikbaar)
- `MemberDetailPanel` — slide-in panel met tabs
- `MemberEditSheet` — full-overlay sheet
- `MobileFilterSheet` — bottom-sheet mobiel, inline desktop
- `BottomSheet` — design-system primitive

---

## Bestanden

### N0: Dark Theme FOUC Fix
- `demo/index.html` — inline critical dark CSS + dynamic theme-color meta
