# H7 — Selectie Ledenbeheer Verbeteren

| | |
|---|---|
| Fase | H7 |
| Status | 📋 TODO |
| Effort | ~6 uur |
| Afhankelijkheid | H5 (done) |

## Wat

De basisflow voor leden toevoegen/verwijderen is gebouwd (H5), maar er missen nog cruciale functies:

1. **Rol wijzigen** — Admin moet de rol (keeper, speler, staf) van een lid kunnen wijzigen vanuit de selectielijst
2. **Assets behouden bij re-add** — Wanneer een lid verwijderd en opnieuw toegevoegd wordt, moeten bestaande assets (foto's, tenue) behouden blijven
3. **Confirmatie bij verwijderen** — Nu verwijdert de rode knop direct zonder bevestiging

### Huidige staat
- ✅ `removeFromSquad` prop + rode `UserMinus` knop op member rijen (admin only)
- ✅ `assignUsersToSeasonSquad` + "Niet in selectie" sectie met + knoppen
- ❌ Geen rol-wijzig UI
- ❌ Geen confirmatie-dialog bij verwijderen
- ❌ Assets worden niet expliciet behouden bij re-add (backend gedrag te verifiëren)

## Technische aanpak

### Rol wijzigen
- `SquadMember` heeft `role` en `functional_roles` velden
- Huidige groupering: `groupByRole()` in `HubSelectieTab.tsx` gebruikt deze velden
- Optie: lange druk of context menu op een lid → rol selector (Keeper / Speler / Staf)
- Backend: PATCH `/memberships/{id}/` met `{ role: 'goalkeeper' }` of `{ functional_roles: ['goalkeeper'] }`

### Assets behouden bij re-add
- Verifieer backend gedrag: als een membership verwijderd wordt, worden assets (file_assets, brand_assets) gedelinkd?
- Indien ja: soft-delete membership i.p.v. hard delete (of deactivate)
- Indien nee: assets hangen aan de user, niet de membership → automatisch behouden

### Bestanden
- `demo/src/pages/identity/HubSelectieTab.tsx` — rol UI + confirmatie
- `demo/src/pages/periods/useSeasonBulkActions.ts` — unassign logic
- `src/memberships/` — backend membership model

## Checklist

- [ ] Rol-wijzig UI: tap op huidige rol → picker met Keeper/Speler/Staf
- [ ] Backend: PATCH membership rol endpoint verifiëren en aansluiten
- [ ] Confirmatie dialog bij "Verwijder uit selectie" ("Weet je zeker...?")
- [ ] Verify: assets behouden na remove + re-add (backend check)
- [ ] Indien nodig: soft-delete implementatie voor memberships
- [ ] Refresh na rol-wijziging (`setMembersReloadToken`)
- [ ] TypeScript 0 errors, Vite build success
