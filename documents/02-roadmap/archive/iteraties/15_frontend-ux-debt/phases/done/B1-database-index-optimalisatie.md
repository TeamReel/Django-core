# B1 — Database Index Optimalisatie

**Status:** 🔲 Todo
**Effort:** ~2 uur (onderzoek gedaan, migraties schrijven + testen)

## Context

Na audit van ~45 Django models (24 bestanden, 16 apps) zijn de meeste FK-velden en common query patterns al goed afgedekt met `Meta.indexes`. Er zijn echter **3 velden** zonder `db_index` en **12 ontbrekende composite indexes** die veelgebruikte querypatronen versnellen.

## Huidige staat: goed geïndexeerd

30+ models hebben al `Meta.indexes` met composites. Alle SearchVector velden hebben GIN indexes. Django's automatische FK indexes dekken de meeste single-column lookups.

## Aanbevolen wijzigingen

### Hoogste impact

| Model | Index | Reden |
|-------|-------|-------|
| **ProjectMembership** | `(project, user, deleted_at)` | Meest frequente access-check (15+ keer in video views). Huidige `(project, deleted_at)` mist `user` dimensie |
| **BrandProfile** | `(organisation, is_active)` | 10+ queries in video services: `.filter(organisation=org, is_active=True)` |
| **BrandProfile** | `(project, is_active)` | Project-level brand lookups |

### Missing `db_index=True`

| Model | Veld | Reden |
|-------|------|-------|
| **BrandProfile** | `is_active` | Gefilterd maar niet geïndexeerd (dekt single-column case) |
| **FileAsset** | `is_deleted` | Cleanup task filtert op `is_deleted=True, deleted_at__lt=cutoff` |
| **OutfitConfiguration** | `is_active` | Gefilterd in sport_configuration views |

### Composite indexes

| Model | Index | Reden |
|-------|-------|-------|
| **FileAsset** | `(is_deleted, deleted_at)` | Soft-delete cleanup query |
| **FileAsset** | `(organization, mime_type)` | Filter op org + mediatype |
| **Setting** | `(organisation, key)` | Hiërarchische setting resolution |
| **Setting** | `(project, key)` | Project-scoped setting lookup |
| **FeatureFlag** | `(organisation, key)` | Flag lookup per org |
| **FeatureFlag** | `(project, key)` | Flag lookup per project |
| **OutfitConfiguration** | `(project, is_active)` | View filtering |
| **ContentTemplate** | `(sport_id, is_active)` | Template filtering op sport FK |
| **MediaItem** | `(project, state, -created_at)` | Dashboard query: actieve media per project |

### Full-text search (GIN) — OK

- `SearchEntry.search_vector` ✅
- `MediaItem.search_vector` ✅
- `Setting.value` (JSONField) ✅

## Implementatie

Per model een migratie genereren met `python manage.py makemigrations`. Migraties zijn backwards-compatible (alleen `CREATE INDEX CONCURRENTLY` op PostgreSQL).

```python
# Voorbeeld: src/projects/models.py → ProjectMembership
class Meta:
    indexes = [
        # bestaande indexes...
        models.Index(fields=['project', 'user', 'deleted_at'], name='projmem_proj_user_del_idx'),
    ]
```

## Scope

| Categorie | Aantal |
|-----------|--------|
| Models reviewed | ~45 |
| Models met goede indexes | 30+ |
| Nieuwe `db_index=True` | 3 velden |
| Nieuwe composite indexes | 12 |
| **Hoogste impact** | `ProjectMembership(project, user, deleted_at)` |
