# Phase M2 -- Member Add Flow

**Track:** M (Modal Migratie)
**Status:** Todo
**Effort:** Medium (2 sessies)
**Vereist:** E1 afgerond
**Migreert:** `pages/identity/AddMemberModal.tsx` (456 regels)

---

## Doel

De AddMemberModal migreren naar een sub-flow binnen de CreateWizard. De gebruiker kan via de + knop "Lid toevoegen" kiezen en het toevoegen/aanmaken van een lid doen als wizard-stappen.

## Huidige AddMemberModal analyse

**Bestand:** `demo/src/pages/identity/AddMemberModal.tsx` (456 regels)

### Twee tabbladen
1. **Bestaand lid** -- zoek op naam/email, selecteer, voeg toe aan team
2. **Nieuw lid** -- maak account aan + voeg toe

### Velden (Nieuw lid)
| Veld | Type | Vereist |
|------|------|--------|
| Voornaam | Text | Ja |
| Achternaam | Text | Ja |
| Email | Email | Ja |
| Rol | Select (speler/coach/staff) | Ja |
| Positie | Select (sport-specifiek) | Nee (alleen bij speler) |
| Rugnummer | Number | Nee |

### Context props
- `contextLevel`: 'organisation' | 'club' | 'team'
- `orgSlug`, `clubProjectId`, `teamProjectId`
- Cascade: lidmaatschap wordt aangemaakt op het juiste niveau

## Wizard Flow Ontwerp

### Stap 1: Bestaand of Nieuw?
- Twee knoppen/kaarten: "Bestaand lid zoeken" vs "Nieuw lid aanmaken"
- Bestaand: zoekbalk + resultaten lijst
- Na selectie: ga naar stap 2 (rol toekennen)

### Stap 2 (Nieuw lid): Persoonsgegevens
- Voornaam, achternaam, email
- Validatie: email format, vereiste velden

### Stap 3: Rol + Context
- Pre-filled team vanuit CreateWizardProvider.prefill
- Rol selectie: speler / coach / staff
- Als speler: positie + rugnummer (sport-specifiek vanuit SportVariant)
- Cascading: org -> club -> team context

### Stap 4: Bevestiging
- Samenvatting
- "Toevoegen" knop
- Na succes: "Nog een lid toevoegen" of "Terug naar team"

## Taken

### 1. MemberAddFlow component
- [ ] `components/CreateWizard/flows/MemberAddFlow.tsx`
- [ ] Orkestreert de stappen, beheert "bestaand vs nieuw" state

### 2. Stap-componenten
- [ ] `steps/MemberSearchStep.tsx` -- zoek + selecteer bestaand lid
- [ ] `steps/MemberDetailsStep.tsx` -- persoonsgegevens (nieuw lid)
- [ ] `steps/MemberRoleStep.tsx` -- rol, positie, rugnummer
- [ ] `steps/MemberConfirmStep.tsx` -- samenvatting + submit

### 3. Zoekfunctionaliteit
- [ ] Hergebruik bestaande member search API
- [ ] Debounced zoeken op naam/email
- [ ] Resultaten met avatar + naam + bestaande rollen

### 4. Sport-specifieke velden
- [ ] Positie-opties laden vanuit SportVariant (bestaande API)
- [ ] Rugnummer: optioneel, nummer-input
- [ ] Toon alleen voor rol "speler"

### 5. Post-create actie
- [ ] "Nog een lid toevoegen" -> reset form, blijf in member flow
- [ ] "Terug naar team" -> sluit wizard
- [ ] "Nog iets anders aanmaken" -> terug naar keuze-stap

### 6. Verificatie
- [ ] Bestaand lid: zoeken + selecteren + rol toekennen
- [ ] Nieuw lid: aanmaken + membership
- [ ] Pre-fill: team context automatisch ingevuld
- [ ] Sport-specifieke velden tonen correct per sport
## Backend Integratie

Zie ook: [backend-integratie.md](../../../wizard-optimization/backend-integratie.md#4-member-org--project-membership)

### Cascade van API calls (tot 4 stappen)

De wizard moet deze calls sequentieel uitvoeren. "Already exists" errors worden geswallowd (idempotent).

#### Stap A: User aanmaken (alleen bij "Nieuw lid")
```
POST /api/v1/admin/users/
Body: { first_name, last_name, email, password, password_confirm }
```
Retourneert: `user.id` (nodig voor stap B-D)

#### Stap B: Organisation Membership
```
POST /api/v1/organisations/{org_slug}/members/
Body: { email: "user@example.com", role: "member" }
```
- Gebruikt `update_or_create` -- reactivates soft-deleted memberships
- Admin-only permissie

#### Stap C: Club ProjectMembership (als club context)
```
POST /api/v1/projects/{club_project_id}/members/
Body: { user_id: 123, role: "editor" }
```

#### Stap D: Team ProjectMembership (als team context)
```
POST /api/v1/projects/{team_project_id}/members/
Body: { user_id: 123, role: "editor", period_id: "uuid" }
```

### Metadata voor spelers
```json
{
  "metadata": {
    "position": "GK",
    "shirt_number": 1
  }
}
```
Let op: `metadata` wordt op ProjectMembership gezet, NIET op de user.

### FK-chain
```
User -> OrgMembership -> ProjectMembership (club) -> ProjectMembership (team)
```
`MembershipService.add_member()` auto-creëert org membership als die ontbreekt.

### Permissies
- Org membership: admin-only
- Project membership: `_check_can_manage_members` op target project

### Soft-delete awareness
- ProjectMembership heeft `deleted_at` veld
- Unique: `(project, user, period)` WHERE `deleted_at IS NULL`
- Reactivatie van soft-deleted memberships is automatisch

### Error handling in wizard
| Status | Betekenis | Actie |
|--------|-----------|-------|
| 201 | Toegevoegd | Success -> "Nog een lid" / "Terug" |
| 400 | Validatie | Inline error (email format, etc.) |
| 403 | Geen rechten | "Je hebt geen rechten om leden te beheren" |
| 409 | Al lid | Melding "[Naam] is al lid van [Team]" (niet blokkeren) |

---
## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/components/CreateWizard/flows/MemberAddFlow.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/MemberSearchStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/MemberDetailsStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/MemberRoleStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/MemberConfirmStep.tsx` |
| REF | `demo/src/pages/identity/AddMemberModal.tsx` (behouden als fallback) |
