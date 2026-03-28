# Q013 — Hardcoded CSS waarden in MemberSummarySheet

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI Review F27 iteratie 2 — Playwright 24-03-2026 |
| Impact | 🟢 nice-to-have |
| Effort | ~0.5 uur |

## Wat

`MemberSummarySheet.module.css` bevat hardcoded waarden die design tokens moeten zijn:

| Locatie | Huidig | Token |
|---------|--------|-------|
| `.assetCardAction` → `font-size` | `10px` | `var(--text-xs)` |
| `.assetCardAction` → `gap` | `2px` | `var(--space-0-5)` of `var(--space-1)` |
| `.legacyInfo` → `gap` | `2px` | `var(--space-0-5)` of `var(--space-1)` |

Per `css.instructions.md` zijn hardcoded waarden niet toegestaan.

## Checklist
- [ ] `font-size: 10px` → `var(--text-xs)` (of `var(--text-2xs)` als dat bestaat)
- [ ] `gap: 2px` → `var(--space-0-5)` of geschikt token
- [ ] Verify visueel dat labels niet breken na tokenisatie
