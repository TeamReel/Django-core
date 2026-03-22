# H4 — Overview & header verbeteringen

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | H2, H3 |

## Doel

Overview secties worden klikbaar. Header en overflow menu worden logisch en correct. Alle broken interactions uit de UX-audit worden gefixed.

## Problemen op te lossen

| ID | Probleem | Fix |
|----|---------|-----|
| 5 | Overview "Assets" sectie alleen status-badges | Rows klikbaar → navigeert naar Assets tab |
| 5 | Overview "Club" sectie alleen status-badges | Rows klikbaar → navigeert naar Club tab |
| 6 | Beheer accordion items alle 3 identiek | Specifieke navigatie per item |
| 7 | Overflow "Bewerken" opent seizoen-edit | Opent team-edit |
| 8 | "Activeren" knop verwarrend | Verwijderen of herformuleren |
| 9 | Bottom nav "Mijn Club" bij OrgAdmin | Altijd "Mijn Team" |

## Taken

### 1. Overview "Assets" sectie klikbaar (`MyTeamHubPage.tsx`)
- [ ] Rij "Tenue": `onTap` → navigeer naar `?tab=assets` (scroll naar tenue sectie)
- [ ] Rij "Sponsor": `onTap` → navigeer naar `?tab=assets`
- [ ] Rij "Ledenfoto's": `onTap` → navigeer naar `?tab=assets`
- [ ] Rij "Club logo": `onTap` → navigeer naar `?tab=assets` (club sectie)
- [ ] Chevron icoon (`>`) zichtbaar op elke rij

### 2. Overview "Club" sectie klikbaar
- [ ] Rij "Clublogo": `onTap` → navigeer naar `?tab=club`
- [ ] Rij "Brand profiel": `onTap` → navigeer naar `?tab=club`
- [ ] Rij "Club assets": `onTap` → navigeer naar `?tab=club`
- [ ] Chevron icoon op elke rij

### 3. Beheer accordion specifieke navigatie
De Beheer-accordion op Overview heeft 3 items die alle 3 `navigateToTab('beheer')` aanroepen. Dit fixen:
- [ ] "Team instellingen" → `navigateToTab('beheer')` + scroll naar settings sectie (via hash of querystring: `?tab=beheer&section=settings`)
- [ ] "Competities" → `navigateToTab('beheer')` + scroll naar competities sectie
- [ ] "Assets uploaden" → `navigateToTab('assets')` (niet Beheer)

### 4. Overflow menu correcties (`MyTeamHubPage.tsx`)
- [ ] **"Bewerken"** → opent `TeamEditSheet` of navigeert naar team-edit pagina (niet `SeasonEditSheet`)
  - Check welke edit component beschikbaar is voor team-level edit
  - Fallback: navigeer naar `?modal=team-edit`
- [ ] **"Activeren"** → verwijderen uit overflow menu (vervangen door SeasonSwitcher flow)
  - Of: hernoemen naar "Stel in als actief seizoen" en alleen tonen als actief seizoen ≠ geselecteerd seizoen
- [ ] **"Bekijken"** → blijft staan (opent publiek team profiel)
- [ ] **"Delen"** → blijft staan (als aanwezig)

### 5. Header SeasonSwitcher label
- [ ] Label toont: geselecteerd seizoen naam (bijv. "2025-2026")
- [ ] Bij 1 seizoen: static label zonder dropdown
- [ ] Bij 2+ seizoenen: klikbare dropdown (al werkend via `SeasonSwitcher` component)
- [ ] Verwijder aparte "Actief" badge/knop naast de switcher als die er nog is

### 6. Bottom nav label fix (`MobileBottomNav.tsx`)
- [ ] Verwijder de logica die "Mijn Club" toont voor OrgAdmins
- [ ] Altijd label "Mijn Team" tonen
- [ ] Navigatie: 3-seg URL naar het team (via `routes.teamHub()`)

## Verificatie

- [ ] Overview "Assets" rijen: tap navigeert naar Assets tab
- [ ] Overview "Club" rijen: tap navigeert naar Club tab
- [ ] Beheer accordion: "Team instellingen" → beheer, "Assets uploaden" → assets tab
- [ ] Overflow "Bewerken" → opent team-edit (niet seizoen-edit)
- [ ] "Activeren" niet meer zichtbaar in overflow (of herformuleerd)
- [ ] Bottom nav label = "Mijn Team" (ook voor OrgAdmins)
- [ ] `npx tsc --noEmit` clean
