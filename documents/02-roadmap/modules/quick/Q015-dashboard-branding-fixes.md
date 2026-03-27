# Q015 — Dashboard Branding Fixes

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI Review + gebruiker-feedback (F29 deploy) |
| Impact | 🔴 critical |
| Effort | ~3 uur |

## Wat

Na de F29 Home Page Premium deploy zijn er drie branding-problemen:

1. **Verkeerde club-branding** — Gebruiker is lid van ASC (team Helden 6), maar ziet KNVB branding (org-niveau).
   `useBrandProfile` zoekt op `projectId` (= Helden 6, een team-project) → vindt geen profiel → valt NIET terug op het parent club-project (ASC) waar de logo's wél zijn geüpload.

2. **"KNVB" subtitle voegt niets toe** — Onder "Welkom, Brian" staat de organisatienaam "KNVB". De gebruiker wil iets nuttigs zien, niet de overkoepelende bond.

3. **Match-logo's tonen niet** — `MatchesCard` en `HeroBanner` lezen logo's uit `match.metadata.identity.home_team_logo_url`. Deze worden alleen gezet bij match-aanmaak vanuit `project.metadata.identity.logo_url`. Als de logo's enkel als BrandAsset (`club_logo`) bestaan maar niet in project-metadata, zijn ze leeg in bestaande wedstrijden.

## Root Cause

```
Data model:  Organisation (KNVB) → Project/Club (ASC) → Project/Team (Helden 6)
BrandProfile:  Zit op ASC (club), NIET op Helden 6 (team)
Context:       context.project = Helden 6  →  useBrandProfile(projectId: helden6_id) → ∅
```

`useBrandProfile` hook heeft GEEN cascade-logica:
- ❌ Team project → geen profiel → geeft leeg terug
- ✅ Zou moeten: team → parent club → org (zoals backend `get_effective_brand()` wel doet)

## Checklist

### Fix 1: Brand profile cascade in `useBrandProfile`
- [ ] Als `projectId` geen profiel oplevert, probeer `parent_project_id` van het actieve context-project
- [ ] Als parent ook geen profiel oplevert, val terug op `organisationId`
- [ ] Bestand: `demo/src/hooks/useBrandProfile.ts` → `fetchProfile()` callback

### Fix 2: Dashboard subtitle verbeteren
- [ ] Vervang statische org/project naam door context-bewuste tekst
- [ ] Voorstel: toon team + seizoen (bijv. "Helden 6 · 2025-2026") of een dynamische greeting op basis van tijdstip
- [ ] Als geen project: toon organisatienaam als fallback
- [ ] Bestand: `demo/src/pages/DashboardPage.tsx` → `.orgSubtitle`

### Fix 3: Match-logo's fallback via BrandProfile
- [ ] `MatchesCard` + `HeroBanner`: als `match.metadata.identity.*_logo_url` leeg is, haal logo op via BrandProfile van het betreffende project
- [ ] Gebruik `useBrandProfile` voor eigen team (altijd beschikbaar uit context)
- [ ] Tegenstander-logo: fallback naar initialen-avatar (geen extra API-call)
- [ ] Bestanden: `demo/src/components/dashboard/MatchesCard.tsx`, `demo/src/components/dashboard/HeroBanner.tsx`

### Verificatie
- [ ] TypeScript compilatie: `npx tsc --noEmit`
- [ ] Vite build: `npx vite build`
- [ ] Visuele check via Playwright: dashboard toont ASC-logo, ASC-kleuren, logo's bij wedstrijden
