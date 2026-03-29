# Q035 — Any Types Opschonen in Production Code + Packages

| | |
|---|---|
| Status | 📋 TODO |
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
- [ ] Type `response.data` correct in projectsApi.ts
- [ ] Type `response.data` correct in organisationsApi.ts
- [ ] Type css.d.ts module declarations met Record of specifieke types
- [ ] Vervang `as any` in Tooltip.tsx door correcte type
- [ ] Type `theme` in validate-theme.ts
- [ ] Tests
- [ ] Verify: `pnpm exec tsc --noEmit`
