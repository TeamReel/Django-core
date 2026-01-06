# Railway Search Deployment Checklist

Use this checklist to manually deploy search functionality to Railway.

## Pre-Deployment
- [ ] Code merged to main branch
- [ ] Railway auto-deployed latest main
- [ ] Railway CLI installed (`npm i -g @railway/cli`)
- [ ] Authenticated with Railway (`railway login`)

## Deployment Steps

### 1. Run Migrations
```bash
railway run python manage.py migrate
```
Expected: `Applying search.0001_enable_pg_trgm... OK` and `0002_create_search_entry... OK`

### 2. Build Search Index
```bash
railway run python manage.py rebuild_search_index
```
Expected: `Processed X objects` for User, Organisation, Project

### 3. Verify Index
```bash
railway run python manage.py shell
```
Then run:
```python
from search.models import SearchEntry
print(f"Total: {SearchEntry.objects.count()}")  # Should be > 0
exit()
```

### 4. Test Search UI
- [ ] Open: `https://your-app.up.railway.app/search/`
- [ ] Enter: "Premier"
- [ ] Verify: Results appear with highlighting

### 5. Test Search API
```bash
curl "https://your-app.up.railway.app/api/v1/search/?q=premier"
```
- [ ] Returns JSON with `organisations`, `projects`, `users` keys
- [ ] Each result has `id`, `title`, `description`, `url`, `highlight`

### 6. Test Permission Filtering
- [ ] Log in as regular user (not superuser)
- [ ] Search for content
- [ ] Verify: Only accessible organisations/projects appear

## Troubleshooting

### No results returned
```bash
# Check if demo data exists
railway run python manage.py shell
```
```python
from organisations.models import Organisation
print(Organisation.objects.count())  # Should be > 0
```

If 0, seed demo data:
```bash
railway run python manage.py seed_football_data
railway run python manage.py rebuild_search_index
```

### pg_trgm error
```bash
railway run python manage.py dbshell
```
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q
```

### Slow searches
Check database indexes:
```bash
railway run python manage.py dbshell
```
```sql
\d search_searchentry
-- Should show indexes on search_vector, content_type, object_id
```

## Post-Deployment
- [ ] Search response time < 200ms
- [ ] Highlighting works (bold tags visible)
- [ ] Results respect user permissions
- [ ] Demo Shell navigation includes search link
- [ ] No errors in Railway logs

## Rollback
If issues occur:
```bash
# Disable search temporarily
railway run python manage.py shell
```
```python
from django.conf import settings
# Comment out 'search.apps.SearchConfig' in INSTALLED_APPS
# Redeploy
```

## Success Criteria
✅ All pre-deployment checks passed
✅ Migrations applied successfully
✅ Search index populated
✅ UI renders and returns results
✅ API returns valid JSON
✅ Permission filtering works
✅ Performance acceptable

## Documentation
- Full guide: `docs/railway/SEARCH_DEPLOYMENT.md`
- Manual tests: `manual-tests/036-search-engine-foundation.md`
- API spec: `kitty-specs/036-search-engine-foundation/contracts/search-api.yaml`
