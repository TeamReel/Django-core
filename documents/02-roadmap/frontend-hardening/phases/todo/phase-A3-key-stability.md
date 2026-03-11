# A3 — Key Stability

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** 32 `key={index}` → stable keys

---

## Doel

Alle list renderings gebruiken stabiele keys (id, slug, unieke property) in plaats van array index.

## Current State

- 32 `key={i}`, `key={idx}`, `key={index}` patronen
- React reconciliation werkt incorrect bij reorder/delete met index keys
- Veroorzaakt subtle bugs bij: drag-and-drop, filtering, animaties

## Aanpak

### Per case, kies de juiste key:

| Data type | Key |
|-----------|-----|
| API entity (met `id`) | `key={item.id}` |
| API entity (met `slug`) | `key={item.slug}` |
| Static config array | `key={item.value}` of `key={item.label}` |
| Geen uniek veld beschikbaar | `key={\`${item.type}-${item.name}\`}` |
| Echt alleen index-based (statisch, nooit reorder) | `key={index}` mag, maar voeg comment toe |

### Stappen
1. Zoek alle `key={i}`, `key={idx}`, `key={index}` in `.tsx` files
2. Per case: identificeer het dichtstbijzijnde unieke veld
3. Vervang index door stabiele key
4. Test dat lijsten correct renderen na filter/sort

## Verificatie

- [ ] 0 `key={index}` zonder expliciete motivatie-comment
- [ ] Lijsten met sort/filter werken correct
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
