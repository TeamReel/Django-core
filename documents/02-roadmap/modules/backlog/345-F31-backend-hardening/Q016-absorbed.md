# Q016 — N+1 Fix: UserListSerializer

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
`UserListSerializer` in `accounts/serializers.py` maakt 3 extra queries per user via `get_organisations()` en `get_projects()`. Bij een lijst van 50 users = 150+ extra queries. Dit vertraagt de gebruikerslijst significant.

## Checklist
- [ ] `prefetch_related('memberships__organisation', 'project_memberships__project', 'role_assignments')` toevoegen aan UserViewSet
- [ ] `get_organisations()` herschrijven om prefetched data te gebruiken (geen nieuwe queries)
- [ ] `get_projects()` herschrijven
- [ ] BrandProfileSerializer.get_token_count() → `len(obj.design_tokens.all())` ipv `.count()` (L99)
- [ ] Tests
- [ ] Verify met Django Debug Toolbar of query count
