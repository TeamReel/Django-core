# Q027 — Frontend barrel exports toevoegen

| | |
|---|---|
| Status | � DOING |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟢 nice-to-have |
| Effort | ~0.5 uur |

## Wat
10 component-mappen missen een `index.ts` barrel export. Dit maakt imports inconsistent en langer dan nodig.

**Let op**: De folders zijn in `demo/src/components/` (niet `features/` zoals eerst gedacht).

## Toegevoegde barrel exports

| Folder | Exports |
|--------|---------|
| `ActivityFeed/` | `ActivityFeed` |
| `AuditLog/` | `AuditLogTable` |
| `Branding/` | `BrandIdentityPage`, `BrandProfileCard`, `ProfileHeader`, `EmptyState`, `CopyableValue`, `ColorPaletteSection`, `TypographySection`, `OtherTokensSection`, `BrandAssetsSection`, types |
| `FeatureFlags/` | `FeatureFlagsCard`, `ContentAvailabilityCard`, helpers |
| `Governance/` | `GovernanceSummaryCard` |
| `IdentitySettings/` | `IdentitySettingsCard`, types |
| `Organisations/` | `PolicyList` |
| `ProjectAccessControl/` | `MemberList`, `AuditLogViewer` |
| `transactions/` | `TransactionsPanel`, `CreateTransactionModal`, types |
| `TransactionWidget/` | `TransactionWidget` |

## Checklist
- [x] Voeg `index.ts` toe in elke map met re-exports
- [x] Update bestaande imports die direct naar bestanden verwijzen (niet nodig)
- [x] Verify (tsc --noEmit + vite build)
