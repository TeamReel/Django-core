# H11 — Cleanup & Dual-Write Stop

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~2 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | H10 (migratie gedraaid en geverifieerd) |

## Doel

Na succesvolle migratie: stop dual-write, verwijder suffix-constructie en root-level fallbacks.

## Implementatie

### 1. `set_asset_variant()` — stop dual-write

- Verwijder `dual_write` parameter → altijd alleen genest formaat
- Root-level suffix write verdwijnt

### 2. `get_asset_variant()` — verwijder suffix fallback

- Verwijder `_read_legacy_suffix()` fallback
- Optioneel: root fallback behouden (voor echt oude data)

### 3. Code cleanup

- Verwijder `_read_legacy_suffix()` functie
- Verwijder suffix-gerelateerde comments en legacy code
- Verwijder fallback chain complexiteit in job.py

### 4. Feature flag (optioneel)

```python
ASSET_LEGACY_FALLBACK = False  # True voor rollback
```

## Acceptatiecriteria

- [ ] Dual-write gestopt
- [ ] Suffix-constructie code verwijderd
- [ ] Genest formaat is de enige write-path
- [ ] Root fallback achter flag (optioneel)
- [ ] Geen regressies
