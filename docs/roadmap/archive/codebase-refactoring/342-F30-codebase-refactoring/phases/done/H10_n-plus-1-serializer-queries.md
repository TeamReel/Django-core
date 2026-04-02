# H10 — N+1 Serializer Queries fixen

> **Effort:** ~3 uur | **Impact:** Directe performance-verbetering voor API lijsten

## Context

Project- en Organisatie-serializers doen 5-9 losse database queries per object via `get_*_count()` methodes.
Bij een lijst van 50 projecten = **250 extra queries**. Generative output serializer doet `FileAsset.objects.get()` per item.

## To do

### Project serializer → `annotate()`
- [ ] Vervang `get_member_count()` door `annotate(member_count=...)` in `ProjectViewSet.get_queryset()`
- [ ] Vervang `get_seasons_count()` door `annotate(seasons_count=...)`
- [ ] Vervang `get_competitions_count()` door `annotate(competitions_count=...)`
- [ ] Vervang `get_matches_count()` door `annotate(matches_count=...)`
- [ ] Vervang `get_sport_variants_count()` door `annotate(sport_variants_count=...)`
- [ ] Serializer velden wijzigen van `SerializerMethodField` naar `IntegerField(read_only=True)`

### Organisatie serializer → `annotate()`
- [ ] Vervang alle 9 `get_*_count()` methodes door `annotate()` in `OrganisationViewSet.get_queryset()`
- [ ] Let op: `get_project_count` gebruikt `len(obj.projects.all())` — extra slecht, evalueert hele queryset

### Generative output serializer
- [ ] `FileAsset.objects.get(id=obj.file_id)` op L295 → `select_related('file')` of `prefetch_related` in ViewSet

### Bestanden
- `src/projects/api/serializers_project.py` — 5 methodes
- `src/projects/api/views_project.py` — `get_queryset()` uitbreiden met annotations
- `src/organisations/api/serializers.py` — 9 methodes
- `src/organisations/api/views.py` — `get_queryset()` uitbreiden met annotations
- `src/generative/serializers.py` L295 — `get_storage_info()`
- `src/generative/views.py` — `GenerationOutputViewSet.get_queryset()`

## Done criteria

- [ ] Project list API doet max 3-5 queries ongeacht aantal projecten (was N×5)
- [ ] Organisatie list API doet max 3-5 queries ongeacht aantal organisaties (was N×9)
- [ ] Generative output list laadt FileAssets via prefetch (was N×1)
- [ ] API response data is identiek (zelfde veldnamen, zelfde waarden)
- [ ] Alle bestaande tests slagen
