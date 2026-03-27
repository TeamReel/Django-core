# H4 — Backend Optimalisatie

> **Effort:** ~4 uur | **Impact:** Veiliger doorontwikkelen met test-net, schonere code

## To do

### Test coverage uitbreiden (top 5 ongeteste apps)
- [ ] `src/branding/` — tests voor BrandProfile CRUD, BrandAsset opslag, logo URL generatie
- [ ] `src/files/` — tests voor FileAsset CRUD, S3 storage backend, presigned URL generatie
- [ ] `src/transactions/` — tests voor Transaction model, credit balance berekening
- [ ] `src/credits/` — tests voor Credits API, balance endpoints
- [ ] `src/medialib/` — tests voor MediaAsset CRUD, variant processing triggers

### Grote serializers opsplitsen
- [ ] `src/activities/api/serializers.py` (500+ LOC) — extract NestedProjectSerializer, NestedParticipationSerializer
- [ ] `src/organisations/api/serializers.py` (500+ LOC) — extract MembershipNestedSerializer, OrgSummarySerializer

### TODO/FIXME audit
- [ ] Inventariseer alle 76 TODO/FIXME comments
- [ ] Categoriseer: (A) achterhaald — verwijder, (B) relevant — maak roadmap item, (C) bewust — laat staan
- [ ] Verwijder achterhaalde TODO's, maak backlog items voor de rest

### Code patterns verificatie  
- [ ] Controleer dat alle ViewSets `permission_classes` hebben
- [ ] Controleer dat alle querysets org-scoped zijn
- [ ] Controleer `select_related`/`prefetch_related` op veelgebruikte endpoints
- [ ] Verwijder ongebruikte imports in key bestanden

## Done criteria

- [ ] Tests bestaan voor branding, files, transactions, credits, medialib (minimaal CRUD + happy path)
- [ ] Geen serializer-bestanden >400 LOC
- [ ] TODO count gedaald van 76 naar <40 (achterhaalde verwijderd)
- [ ] `python -m pytest --no-cov` slaagt
- [ ] Alle ViewSets hebben `permission_classes`
