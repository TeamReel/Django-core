# T5 — `as any` & `: any` Final Cleanup

**Track:** T — Type Safety
**Status:** ✅ Done
**Geschatte effort:** 2 uur

---

## Doel

Laatste `any` restanten elimineren: `as any` casts en `: any` annotaties.

## Scope

| Categorie | Files | Hits |
|-----------|------:|-----:|
| `as any` casts | 19 | 20 |
| `: any` annotaties | 11 | 18 |
| **Totaal** | **~28** | **38** |

## Aanpak

1. `as any` → proper type assertion of generics
2. `: any` → explicit type of `unknown` + type guard
3. Per file: analyseer waarom `any` nodig was, fix root cause
4. Verify met `tsc --noEmit` + strict mode

## Acceptatiecriteria

- [x] 0 `as any` in productiebestanden
- [x] 0 `: any` in productiebestanden
- [x] 0 totale `any` in de hele codebase
- [x] `tsc --noEmit` passeert
- [x] Tests groen
