# Q028 — Kleine frontend cleanup (any, lazy, kleur)

| | |
|---|---|
| Status | � DOING |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟢 nice-to-have |
| Effort | ~15 min |

## Wat
Drie kleine frontend-problemen gebundeld in één quick:

### 1. ✅ `any` types in productie-code
**Bevinding**: Geen `any` types gevonden in productie-code.
- `MatchLineupField.tsx` — geen `any`
- `HubWedstrijdenTab.tsx` — geen `any`  
- `lazyWithRetry.ts` — heeft `ComponentType<any>` maar met eslint-disable comment (intentional, matches React.lazy signature)

### 2. ✅ Images zonder `loading="lazy"`
**Bevinding**: 2 images gevonden en gefixd (niet 5):
- `AssetsTabTeamLevel.tsx:42` — thumbnail → added `loading="lazy"`
- `MediaReadinessMembers.tsx:219` — avatar → added `loading="lazy"`

**Niet gefixd** (above the fold, should NOT be lazy):
- `TopNavbar.tsx:64,94` — logo images

### 3. ✅ Hardcoded kleur
- Added `--color-brand-whatsapp: #25d366` to [tokens.css](demo/src/styles/tokens.css)
- Updated `ContentShareSheet.module.css` to use `var(--color-brand-whatsapp)`

## Checklist
- [x] Vervang 3 `any` types door juiste types → **al compliant**
- [x] Voeg `loading="lazy"` toe aan 2 images
- [x] Vervang hardcoded kleur door design token `--color-brand-whatsapp`
- [x] Verify (tsc --noEmit + vite build)
