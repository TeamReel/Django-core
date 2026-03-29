# Q027 — Frontend barrel exports toevoegen

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat
10 component-mappen missen een `index.ts` barrel export. Dit maakt imports inconsistent en langer dan nodig.

## Mappen
- `demo/src/features/ActivityFeed/`
- `demo/src/features/AuditLog/`
- `demo/src/features/Branding/`
- `demo/src/features/FeatureFlags/`
- `demo/src/features/Governance/`
- `demo/src/features/IdentitySettings/`
- `demo/src/features/Organisations/`
- `demo/src/features/ProjectAccessControl/`
- `demo/src/features/TransactionWidget/`
- `demo/src/features/transactions/`

## Checklist
- [ ] Voeg `index.ts` toe in elke map met re-exports
- [ ] Update bestaande imports die direct naar bestanden verwijzen
- [ ] Verify (tsc --noEmit + vite build)
