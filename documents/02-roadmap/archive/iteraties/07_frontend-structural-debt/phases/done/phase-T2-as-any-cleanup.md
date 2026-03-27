# T2 — `as any` → Typed Casts

**Status:** ✅ Done
**Effort:** 4 uur
**Scope:** 1,006 → 193 `as any` casts (81% reduction)
**Vereist:** T1 (API types beschikbaar)

---

## Doel

`as any` is de meest gebruikte type-suppression (1.117x). Elk geval schakelt TypeScript's type checker uit. Na T1 zijn de API types beschikbaar om `as any` te vervangen.

## Strategie

| Pattern | Voorbeeld | Fix |
|---------|-----------|-----|
| API response cast | `const data = res as any` | `const data = res as Activity` |
| State cast | `setItems(items as any)` | Type de state correct |
| Prop forwarding | `{...props as any}` | Type de props interface |
| JSON parse | `JSON.parse(text) as any` | `JSON.parse(text) as Config` |

## Top 20 bestanden (79% van alle `as any`)

Focus op deze bestanden eerst — ze bevatten de meeste casts.

## Aanpak

1. Start met files die >20 `as any` hebben (top 10)
2. Import types uit `types/api/`
3. Vervang `as any` → `as CorrectType`
4. Fix compile errors die ontstaan
5. Werk richting files met 10-20, dan 5-10, etc.

## Verificatie

- [x] `as any` count < 200 (van 1.006 → 193)
- [x] Geen nieuwe `as any` geïntroduceerd
- [x] `npx vite build` slaagt
- [x] 30/30 tests passing
