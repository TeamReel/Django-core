# T2 — Utility Type Fixes

**Status:** ✅ Done
**Effort:** ~1 uur
**Bestanden:** 3 files, ~12 `any` → proper types

## Wat is gedaan

Eliminatie van `any` types in gedeelde utility functies en helper modules die door meerdere pagina's worden gebruikt.

## Gewijzigde bestanden

### `demo/src/utils/apiEnvelope.ts`
- **~6 `any` → typed:** Alle functies generisch gemaakt (`<T = unknown>`), alle `Record<string, any>` → `Record<string, unknown>`, explicit type narrowing voor nested access
- `extractList<T>()` en `parseListEnvelope<T>()` retourneren nu typed arrays
- `unwrapEnvelope`: expliciete `Record<string, unknown>` casts

### `demo/src/pages/identity/orgDataHelpers.ts`
- **4 `any` → typed:** `getBestMatchDetailPath(m: any)` → nieuw `MatchRef` interface met specifieke nested shape
- 3× `Map<string, any>` → `Map<string, Project>` en `Map<string, Period>`

### `demo/src/pages/config/credits/creditsTypes.ts`
- **`parseTransactionEnvelope(rawData: any)` → `(rawData: unknown)`**: Volledige herschrijving met expliciete `Record<string, unknown>` casts en intermediate type narrowing

## Verificatie

- 0 TypeScript errors in alle 3 bestanden
- 0 cascading errors in alle consumer directories
