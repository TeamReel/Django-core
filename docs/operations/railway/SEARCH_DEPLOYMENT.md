# Search Functionality Deployment - Railway

## Status
Feature `036-search-engine-foundation` is merged to main and ready for Railway deployment.

## Prerequisites
- ✅ Code merged to main
- ✅ Search app configured in INSTALLED_APPS
- ✅ URL routing configured (`/search/` and `/api/v1/search/`)
- ✅ Search indexes registered (User, Organisation, Project)
- ✅ Signals connected for auto-indexing

## Deployment Steps

### 1. Deploy Code to Railway
Railway should automatically deploy when main branch is updated. The search functionality will be included in the deployment.

**Verify deployment:**
```bash
# Check Railway logs for successful deployment
railway logs
```

### 2. Run Database Migrations
The search feature includes 2 migrations:
- `0001_enable_pg_trgm.py` - Enables PostgreSQL trigram extension
- `0002_create_search_entry.py` - Creates SearchEntry model and indexes

**Run migrations on Railway:**
```bash
# Via Railway CLI
railway run python manage.py migrate

# Or via Railway dashboard
# Service → Settings → Deploy → Add command: python manage.py migrate
```

**Expected output:**
```
Running migrations:
  Applying search.0001_enable_pg_trgm... OK
  Applying search.0002_create_search_entry... OK
```

### 3. Build Search Index
Populate the search index with existing data (Users, Organisations, Projects).

**Run rebuild command on Railway:**
```bash
# Via Railway CLI
railway run python manage.py rebuild_search_index

# Or via Railway dashboard one-time command
python manage.py rebuild_search_index
```

**Expected output:**
```
Found 3 registered models.
Processing accounts.User...
Processed X objects for accounts.User.
Processing organisations.Organisation...
Processed X objects for organisations.Organisation.
Processing projects.Project...
Processed X objects for projects.Project.
Successfully rebuilt search index.
```

### 4. Verify Search Functionality

**Test endpoints:**

1. **Demo UI:**
   - Visit: `https://your-railway-app.up.railway.app/search/`
   - Enter search query (e.g., "Premier League")
   - Verify grouped results appear (Users, Organisations, Projects)

2. **API Global Search:**
   ```bash
   curl "https://your-railway-app.up.railway.app/api/v1/search/?q=premier"
   ```
   Expected response:
   ```json
   {
     "organisations": [...],
     "projects": [...],
     "users": [...]
   }
   ```

3. **API Filtered Search:**
   ```bash
   curl "https://your-railway-app.up.railway.app/api/v1/search/?q=premier&types=organisations"
   ```
   Expected response (paginated):
   ```json
   {
     "count": 1,
     "next": null,
     "previous": null,
     "results": [...]
   }
   ```

### 5. Test Permission Filtering
Verify that search results respect user permissions:

1. Log in as a regular user (not superuser)
2. Search for content
3. Verify only organisations/projects the user has access to appear

## Post-Deployment Monitoring

### Check Search Index Population
```bash
# Via Railway CLI
railway run python manage.py shell

# In shell:
from search.models import SearchEntry
print(f"Total search entries: {SearchEntry.objects.count()}")
print(f"Users indexed: {SearchEntry.objects.filter(content_type__model='user').count()}")
print(f"Organisations indexed: {SearchEntry.objects.filter(content_type__model='organisation').count()}")
print(f"Projects indexed: {SearchEntry.objects.filter(content_type__model='project').count()}")
```

### Check Database Indexes
```bash
# Verify pg_trgm extension is enabled
railway run python manage.py dbshell

# In psql:
\dx pg_trgm
# Should show: pg_trgm | 1.x | public | text similarity measurement and index searching based on trigrams
```

### Performance Verification
Search queries should complete in <200ms:

```bash
# Test search performance via Django shell
railway run python manage.py shell

# In shell:
import time
from search.backend.postgres import PostgresSearchBackend
from accounts.models import User

backend = PostgresSearchBackend()
user = User.objects.first()

start = time.time()
results = backend.search("premier", user)
duration = (time.time() - start) * 1000
print(f"Search completed in {duration:.2f}ms")
print(f"Results: {results.count()}")
```

## Troubleshooting

### Issue: pg_trgm extension not enabled
**Error:** `django.db.utils.ProgrammingError: extension "pg_trgm" does not exist`

**Solution:**
```bash
railway run python manage.py dbshell
# In psql:
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q
```

### Issue: No search results
**Cause:** Search index not populated

**Solution:**
```bash
railway run python manage.py rebuild_search_index
```

### Issue: Search returns all results (no permission filtering)
**Cause:** Permission checks not working

**Solution:** Verify user is not a superuser, and that they have proper organisation memberships.

## Automatic Index Updates

The search index automatically updates when:
- A User, Organisation, or Project is created → Signal triggers indexing
- An existing record is updated → Signal triggers re-indexing
- A record is deleted → Signal removes from index

**No manual re-indexing needed for ongoing operations.**

## Rollback Plan

If issues occur, search functionality can be disabled without affecting other features:

1. **Disable search app temporarily:**
   ```python
   # In settings, comment out:
   # "search.apps.SearchConfig",
   ```

2. **Remove search URL:**
   ```python
   # In web_ui/urls.py, comment out:
   # path("search/", views.search_page, name="ui_search"),
   ```

3. **Redeploy without search:**
   ```bash
   git commit -am "Temporarily disable search"
   git push origin main
   ```

## Demo Data Verification

The search functionality is tested with "Football Leagues" demo data:
- **Organisations:** Premier League, La Liga, Bundesliga
- **Projects:** VAR Implementation, Stadium Renovation, Youth Academy
- **Users:** Alice Referee, Bob Manager, Charlie Fan

Verify this data exists before testing search:
```bash
railway run python manage.py shell

# In shell:
from organisations.models import Organisation
print(Organisation.objects.filter(name__icontains="league").count())  # Should be > 0
```

If demo data is missing, seed it:
```bash
railway run python manage.py seed_football_data
```

## Success Criteria

✅ Migrations applied successfully
✅ Search index populated (SearchEntry.objects.count() > 0)
✅ Demo UI at `/search/` renders and returns results
✅ API at `/api/v1/search/` returns JSON results
✅ Permission filtering works (non-superusers see limited results)
✅ Search response time < 200ms
✅ Highlighting works (results contain `<b>` tags)

## Reference Documentation

- Feature Spec: `kitty-specs/036-search-engine-foundation/spec.md`
- Manual Test Guide: `manual-tests/036-search-engine-foundation.md`
- API Contract: `kitty-specs/036-search-engine-foundation/contracts/search-api.yaml`
