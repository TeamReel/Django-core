# Q028 — Kleine frontend cleanup (any, lazy, kleur)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟢 nice-to-have |
| Effort | ~30 min |

## Wat
Drie kleine frontend-problemen gebundeld in één quick:

### 1. Laatste 3 `any` types in productie-code
- `MatchLineupField.tsx`
- `HubWedstrijdenTab.tsx`
- `lazyWithRetry.ts`

### 2. 5 images zonder `loading="lazy"`
Afbeeldingen onder de fold die niet lazy geladen worden.

### 3. 1 hardcoded kleur
`#25d366` (WhatsApp groen) in `ContentShareSheet` — moet een design token worden.

## Checklist
- [ ] Vervang 3 `any` types door juiste types
- [ ] Voeg `loading="lazy"` toe aan 5 images
- [ ] Vervang hardcoded kleur door design token
- [ ] Verify (tsc --noEmit + vite build)
