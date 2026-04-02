# Q035 — Any Types Opschonen in Production Code + Packages

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
`any` types in production code (niet test-files) vervangen door correcte types. Voorkomt verborgen bugs en verbetert developer experience.

## Scope
- `packages/context-switcher/src/api/projectsApi.ts` — 2× `as any`
- `packages/context-switcher/src/api/organisationsApi.ts` — 1× `as any`
- `packages/design-system/src/types/css.d.ts` — 2× `any` module declarations
- `packages/design-system/src/components/Tooltip/Tooltip.tsx` — 1× `as any`
- `packages/theme-system/scripts/validate-theme.ts` — 1× `let theme: any`

## Checklist
- [x] Type `response.data` correct in projectsApi.ts
- [x] Type `response.data` correct in organisationsApi.ts
- [x] Type css.d.ts module declarations met Record of specifieke types
- [x] Vervang `as any` in Tooltip.tsx door correcte type
- [x] Type `theme` in validate-theme.ts
- [x] Tests
- [x] Verify: `pnpm exec tsc --noEmit`
