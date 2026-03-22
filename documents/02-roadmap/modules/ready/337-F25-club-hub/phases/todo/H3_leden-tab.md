# H3 — Leden tab

| | |
|---|---|
| Status | TODO |
| Effort | ~5 uur |
| Blokkeerd door | H0 |

## Doel

De Leden tab toont alle club-niveau leden (ProjectMembership op het club Project) en biedt club admins de mogelijkheid om rollen te beheren. Volgt het patroon van de bestaande ledenpagina's in de codebase — geen nieuwe patronen.

## Context

**Data model:**
- Club-leden = `ProjectMembership` waar `project=clubProject` en `period=null`
- Rollen: `viewer`, `editor`, `admin`
- API: `GET /projects/{clubId}/members/` (ProjectMembershipViewSet)
- Lid-metadata: `ProjectMembership.metadata.teamreel_assets.media.profile` (profielfoto URL)

**Verschil met team-leden:**
- Club-leden: management-niveau (admins, editors), geen seizoensafbakening
- Team-leden: spelers + staf, kunnen seizoensgebonden zijn (`period` gezet)
- Beide zijn `ProjectMembership` — zelfde API-endpoint, ander `project_pk`

**Hergebruik:**
- Ledenrij-component: gebruik bestaand patroon van `demo/src/components/MemberRow/` of equivalent
- Upload-patroon: volgt `MemberPhotosSection` uit F24 H3

## Taken

### 1. Leden tab inhoud

Sub-component: `demo/src/pages/identity/ClubLedenTab.tsx` (< 300 regels)

- [ ] Lijst van alle club-leden (ProjectMembership, period=null)
- [ ] Per lid:
  - Profielfoto thumbnail (`metadata.teamreel_assets.media.profile` of initials-fallback)
  - Naam + email
  - Rol badge: `admin` / `editor` / `viewer`
  - "Bewerken" knop (club admin) → inline rol-wijziging of side panel
- [ ] Sortering: admins eerst, dan editors, dan viewers; alfabetisch binnen groep
- [ ] Zoekbalk (filter op naam/email, client-side)
- [ ] Lege staat: "Geen club-leden gevonden."
- [ ] Skeleton: bij laden 5 placeholder-rijen

### 2. Rol beheer (club admin only)

- [ ] Klik "Bewerken" op een lid → opent inline dropdown of `MemberRoleSheet`:
  - Rol wijzigen: `viewer` / `editor` / `admin`
  - Lid verwijderen (met bevestigingsdialog)
- [ ] API: `PATCH /projects/{clubId}/members/{pk}/` `{ role: 'admin' }`
- [ ] Optimistic UI: rol-badge updaten direct bij selectie; revert bij fout
- [ ] Toast bij succes; inline error bij fout
- [ ] Eigen bescherming: club admin kan zichzelf niet degraderen (check `user.id === member.user.id`)

### 3. Uitnodiging toevoegen

- [ ] "Uitnodigen" knop (club admin) → opent `InviteMemberSheet` als die al bestaat in de codebase
- [ ] Als nog niet beschikbaar: knop zichtbaar maar disabled met tooltip "Komt binnenkort"
- [ ] Check bestaande invite-flow in `demo/src/` vóór implementatie

### 4. Sub-component extractie

| Nieuw bestand | Inhoud | Max regels |
|--------------|--------|-----------|
| `ClubLedenTab.tsx` | Ledenlijst + filter | 300 |
| `ClubMemberRow.tsx` | Enkelvoudige ledenrij | 80 |

Als `MemberRow` al bestaat in de codebase: hergebruiken (niet opnieuw bouwen).

### 5. Styling
- [ ] Ledenrij: `min-height: 44px` (touch target), `var(--app-border)` separator
- [ ] Rol badges: `var(--app-primary)` voor admin, `var(--app-muted-text)` voor viewer
- [ ] Zoekbalk: bestaand `SearchInput` component hergebruiken
- [ ] `@media (prefers-reduced-motion: reduce)` op skeleton

## Verificatie

- [ ] Leden tab: alle club-leden zichtbaar met naam, foto, rol
- [ ] Filter: zoeken op naam filtert de lijst
- [ ] Club admin: rol-dropdown beschikbaar; wijziging opgeslagen via API
- [ ] Optimistic UI: rol-badge updatet direct
- [ ] Eigen bescherming: admin kan eigen rol niet verlagen
- [ ] Uitnodigen knop: zichtbaar voor club admin
- [ ] Mobile (375px): touchable rijen, scroll werkt
- [ ] `npx tsc --noEmit` clean
