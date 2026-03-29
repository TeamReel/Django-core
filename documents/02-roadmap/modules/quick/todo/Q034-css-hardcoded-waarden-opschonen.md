# Q034 — CSS Hardcoded Waarden Opschonen

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
Hardcoded rgba() kleuren, z-index magic numbers, en pixel-spacing waarden in CSS modules vervangen door design tokens. Geeft consistentie en maakt rebranding makkelijker.

## Scope
- `utility.css`: 4× hardcoded rgba() → semantic tokens
- `design-system-interactive.css`: 1× hardcoded box-shadow kleur
- z-index audit: 13+ willekeurige waarden → z-index tokens toevoegen aan `tokens.css`
- Inline styles in `UserDetailMembershipTabs.tsx` → CSS Module verplaatsen

## Checklist
- [ ] Definieer z-index tokens in `tokens.css` (--z-dropdown, --z-modal, --z-overlay, etc.)
- [ ] Vervang alle losse z-index waarden door tokens
- [ ] Vervang hardcoded rgba() in `utility.css` door semantic color tokens
- [ ] Vervang hardcoded box-shadow kleur in `design-system-interactive.css`
- [ ] Verplaats inline styles in `UserDetailMembershipTabs.tsx` naar CSS Module
- [ ] Tests
- [ ] Verify: `pnpm exec tsc --noEmit` + `pnpm exec vite build`
