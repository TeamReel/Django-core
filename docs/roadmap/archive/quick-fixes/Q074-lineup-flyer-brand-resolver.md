# Q074 — Lineup flyer: BrandResolver migratie + resolve_brand_color verwijderen

| | |
|---|---|
| Status | � DONE |
| Bron | Pipeline analyse (post-Q072) |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat

Q072 migreerde 3 composers naar `BrandResolver` via `LineupData.brand_primary`, maar `lineup_flyer_generator.py` bleef achter. Daar staat nog:
1. Een 30-regel `_resolve_brand_color()` (regel ~658) — volledige kopie van de oude BrandResolver-logica met eigen DB-queries
2. Entry point `generate_lineup_flyer_for_activity()` roept deze aan als er geen override-kleur is meegegeven

**Maar**: de `LineupSegmentBuilder` maakt al een `LineupData` met `brand_primary`/`brand_secondary` gevuld via `BrandResolver`. Die waarden worden nu genegeerd.

Daarnaast kan `_common.py:resolve_brand_color()` (regel ~426, 30 regels) volledig verwijderd worden — `lineup_flyer_generator.py` was de laatste caller.

## Checklist

- [x] `generate_lineup_flyer_for_activity()`: gebruik `lineup_data.brand_primary or DEFAULT_PRIMARY_COLOR` i.p.v. `_resolve_brand_color(activity_id, "primary")`
- [x] Idem voor `brand_secondary`
- [x] Verwijder `_resolve_brand_color()` uit `lineup_flyer_generator.py` (30 regels)
- [x] Verwijder `resolve_brand_color()` uit `_common.py` (30 regels) + docstring-verwijzing
- [x] Tests: alle bestaande video tests moeten slagen (281 passed)
- [x] Verify
