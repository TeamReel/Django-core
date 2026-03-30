# Q008 — ROLE_LABELS inconsistentie MemberSummarySheet

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review B70 H8 |
| Impact | 🟡 important |
| Effort | ~0.5 uur |

## Wat
`MemberSummarySheet.tsx` heeft een lokale `ROLE_LABELS` map met `goalkeeper` als key, maar de `getMemberRoleStatuses()` functie retourneert role-keys uit `teamreel_assets.roles` die `keeper` gebruiken (niet `goalkeeper`). Hierdoor valt de label lookup terug op de raw string "keeper" i.p.v. "Keeper".

Daarnaast bestaan er 3 duplicaat `ROLE_LABELS` maps:
- `teamSelectieHelpers.ts` (exported, correct: heeft `keeper`)
- `MemberSummarySheet.tsx` (lokaal, mist `keeper`)
- `MemberDetailPanel.tsx` (lokaal, correct: heeft `keeper`)

## Checklist
- [ ] Voeg `keeper: 'Keeper'` toe aan `MemberSummarySheet.tsx` ROLE_LABELS (of importeer uit `teamSelectieHelpers.ts`)
- [ ] Overweeg alle 3 label maps te consolideren naar één shared constant
- [ ] Verify
