# Railway Deployment Guide: B37 Workflow Engine

**Feature**: B37 Workflow Engine & State Machine
**Branch**: `048-workflow-engine-state`
**Target**: Railway Production
**Database**: PostgreSQL (Railway managed)

## Prerequisites

- [ ] All tests passing locally (`pytest tests/workflows/`)
- [ ] Admin fix applied (no `is_published` references)
- [ ] Seed script tested locally
- [ ] Branch pushed to remote repository
- [ ] Railway CLI installed (optional, for manual deployment)

---

## Step 1: Verify Migrations Locally

Before deploying to Railway, ensure migrations are valid:

```bash
# Dry-run migration (no database changes)
python manage.py migrate --dry-run

# Check migration status
python manage.py showmigrations workflows
```

**Expected Output**:
```
workflows
 [ ] 0001_initial
```

If you see `[X] 0001_initial`, migrations are already applied locally (safe to proceed).

---

## Step 2: Merge to Main/Release Branch

**⚠️ CRITICAL**: Railway auto-deploys from `main` or `release/*` branches only.

```bash
# From your worktree
cd .worktrees/048-workflow-engine-state

# Ensure all changes committed
git status

# Push feature branch
git push origin 048-workflow-engine-state

# Return to main repo
cd ../../

# Merge to main (or create PR)
git checkout main
git pull origin main
git merge --no-ff 048-workflow-engine-state -m "feat(workflows): Add B37 Workflow Engine & State Machine"
git push origin main
```

**Railway will auto-deploy** once main branch is pushed (if configured).

---

## Step 3: Apply Migrations to Railway

**Option A: Automatic (via Procfile)**

If `release` phase is configured in `Procfile`:
```procfile
release: python manage.py migrate --no-input
web: gunicorn src.config.wsgi:application
```

Migrations will run automatically during deployment.

**Option B: Manual (via Railway Dashboard)**

1. Open Railway dashboard
2. Navigate to **"Deployments"** → Latest deployment
3. Click **"..."** → **"Run Command"**
4. Enter: `python manage.py migrate`
5. Verify output shows:
   ```
   Running migrations:
     Applying workflows.0001_initial... OK
   ```

**Option C: Railway CLI**

```bash
railway run python manage.py migrate
```

**Verification**:
```bash
railway run python manage.py showmigrations workflows
```

Expected:
```
workflows
 [X] 0001_initial
```

---

## Step 4: Run Seed Script

**⚠️ IMPORTANT**: This script is idempotent - safe to run multiple times.

```bash
# Via Railway CLI
railway run python scripts/seed_workflows.py

# Or via Railway Dashboard "Run Command"
python scripts/seed_workflows.py
```

**Expected Output**:
```
============================================================
Seeding Workflow Templates...
============================================================
✓ Created workflow: Content Approval v1.0.0
✓ Created workflow: Support Ticket v1.0.0
✓ Created workflow: Invoice Approval v1.0.0
============================================================
✓ Seed complete! Total templates: 3
============================================================
```

**Verification**:
- Login to Django Admin: `https://your-railway-domain/admin/workflows/workflowtemplate/`
- Verify 3 templates exist with `is_active=True`

---

## Step 5: Verify Admin Interface

1. Navigate to `https://your-railway-domain/admin/`
2. Login as superuser
3. Verify **"Workflows"** section appears in admin sidebar
4. Click **"Workflow templates"** → Should show 3 seeded templates
5. Click **"Workflow instances"** → Should be empty (or show any existing instances)
6. Click **"Transition histories"** → Read-only view
7. Click **"Project permission overrides"** → Should be empty

**Pass Criteria**:
- ✓ All 4 models registered in admin
- ✓ Templates list loads without errors
- ✓ Can create new template via admin

---

## Step 6: Verify API Endpoints (Swagger)

1. Navigate to `https://your-railway-domain/api/schema/swagger-ui/`
2. Expand **"workflows"** tag
3. Verify 10 endpoints visible:
   - `GET /api/workflows/templates/`
   - `POST /api/workflows/templates/`
   - `GET /api/workflows/templates/{id}/`
   - `PATCH /api/workflows/templates/{id}/`
   - `DELETE /api/workflows/templates/{id}/`
   - `GET /api/workflows/instances/`
   - `POST /api/workflows/instances/`
   - `GET /api/workflows/instances/{id}/`
   - `POST /api/workflows/instances/{id}/execute_transition/`
   - `GET /api/workflows/instances/{id}/history/`

**Pass Criteria**:
- ✓ All endpoints documented
- ✓ Schemas show request/response examples
- ✓ "Try it out" button works (with authentication)

---

## Step 7: End-to-End Smoke Test

Follow **[B37-workflow-engine.md](../08-testing/manual-tests/B37-workflow-engine.md)** manual test file.

**Quick Smoke Test** (abbreviated):

1. **Create Template**:
   ```bash
   curl -X POST https://your-railway-domain/api/workflows/templates/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Smoke Test",
       "version": "1.0.0",
       "description": "Quick test",
       "is_active": true,
       "definition": {
         "states": [
           {"name": "start", "is_initial": true, "is_terminal": false},
           {"name": "end", "is_initial": false, "is_terminal": true}
         ],
         "transitions": [{
           "action": "finish",
           "from_state": "start",
           "to_state": "end",
           "permissions": [],
           "sync_hooks": [],
           "async_hooks": []
         }]
       }
     }'
   ```

2. **Create Instance**:
   ```bash
   curl -X POST https://your-railway-domain/api/workflows/instances/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "workflow": TEMPLATE_ID,
       "project": PROJECT_ID,
       "content_type": "projects.project",
       "object_id": PROJECT_ID,
       "context": {"test": true}
     }'
   ```

3. **Execute Transition**:
   ```bash
   curl -X POST https://your-railway-domain/api/workflows/instances/INSTANCE_ID/execute_transition/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action": "finish", "comment": "Smoke test"}'
   ```

4. **Verify History**:
   ```bash
   curl -X GET https://your-railway-domain/api/workflows/instances/INSTANCE_ID/history/ \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Pass Criteria**:
- ✓ All 4 requests return HTTP 200/201
- ✓ No errors in Railway logs
- ✓ Instance transitions from "start" → "end"
- ✓ History shows transition record

---

## Step 8: Check Railway Logs

1. Open Railway dashboard
2. Navigate to **"Deployments"** → Latest deployment
3. Click **"View Logs"**
4. Filter logs for workflow activity

**Look for**:
- ✓ Migration success: `Applying workflows.0001_initial... OK`
- ✓ Seed script output: `✓ Created workflow: ...`
- ✓ API requests: `GET /api/workflows/...` (HTTP 200)
- ✓ Audit events (if B09 enabled): `workflow.workflow_created`, `workflow.transition_*`
- ✓ Celery tasks (if B15 enabled): `execute_workflow_hooks.delay`

**Red Flags** (should NOT appear):
- ✗ HTTP 500 errors
- ✗ `DoesNotExist` exceptions
- ✗ `IntegrityError` (database constraints)
- ✗ `ImportError` (missing dependencies)

---

## Step 9: Update Delivery Checklist

Update [spec.md](../../kitty-specs/048-workflow-engine-state/spec.md) delivery checklist:

```markdown
## Delivery Checklist

- [X] Migrations applied to Railway
- [X] Seed data loaded (3 templates)
- [X] All models in Django Admin
- [X] All endpoints in Swagger
- [X] End-to-end test passes
- [X] No errors in Railway logs
- [X] Manual test file created
- [X] Feature documented in B37-workflow-engine.md
```

---

## Rollback Plan

If deployment fails or introduces issues:

1. **Revert Code**:
   ```bash
   git checkout main
   git revert HEAD~1  # Revert merge commit
   git push origin main
   ```

2. **Rollback Migration** (if needed):
   ```bash
   railway run python manage.py migrate workflows zero
   ```
   **⚠️ WARNING**: This drops all workflow tables. Only use if no production data exists.

3. **Safe Rollback** (if data exists):
   - Leave migration intact (data preserved)
   - Only revert code changes
   - Fix issues in new branch, redeploy

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Cause**: Migration already applied (likely from previous deployment attempt)

**Solution**:
```bash
railway run python manage.py showmigrations workflows
```

If `[X] 0001_initial`, migration is already applied. Safe to proceed.

### Issue: Seed script fails with "DoesNotExist: WorkflowTemplate matching query does not exist"

**Cause**: Migration not applied before seed script

**Solution**:
1. Verify migrations: `railway run python manage.py showmigrations workflows`
2. Apply migrations: `railway run python manage.py migrate`
3. Re-run seed script

### Issue: Admin shows "is_published" error

**Cause**: Admin config references non-existent field

**Solution**: Verify `src/workflows/admin.py` does NOT reference `is_published` in:
- `list_display`
- `list_filter`
- `fieldsets`

Apply admin fix from commit history.

### Issue: API endpoints return 404

**Cause**: URLs not registered or DRF not configured

**Solution**:
1. Verify `src/workflows/urls.py` exists and is registered in main `urls.py`
2. Check `INSTALLED_APPS` includes `'rest_framework'` and `'src.workflows'`

---

## Post-Deployment Verification

- [ ] All migrations applied (`showmigrations` shows `[X]`)
- [ ] Seed data loaded (3 templates in admin)
- [ ] Django Admin accessible with all 4 models
- [ ] Swagger docs show 10 workflow endpoints
- [ ] End-to-end smoke test passes
- [ ] No errors in Railway logs (last 100 lines)
- [ ] Manual test file accessible
- [ ] Feature documented in module README

**Feature Status**: ✅ PRODUCTION READY

---

## Next Steps

1. **Product Integration**: Implement product-specific workflows (e.g., TeamReel match analysis workflow)
2. **Custom Hooks**: Register hooks for B16 Notifications (e.g., notify on approval)
3. **Permission Overrides**: Configure project-level permissions via `ProjectPermissionOverride`
4. **Monitoring**: Add alerts for workflow failures or long-running transitions

**Documentation**: See [B37-workflow-engine.md](../../documents/04-modules/B37-workflow-engine.md) for usage examples.
