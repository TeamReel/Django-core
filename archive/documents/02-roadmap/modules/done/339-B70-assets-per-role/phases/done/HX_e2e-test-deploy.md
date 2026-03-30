# HX — E2E Test + Deploy Draaiboek

| | |
|---|---|
| Fase | HX |
| Effort | ~2 uur |
| Laag | Full-stack |
| Afhankelijkheid | Alle voorgaande fases |

## Doel

Volledige end-to-end verificatie en gedetailleerd deploy-draaiboek met rollback procedure.

## Scope

### E2E Test Scenario's

1. **Upload flow**: Upload asset met role → check metadata structuur → check S3 pad
2. **Multi-role member**: Lid met keeper + speler → upload keeper asset → check dat speler assets ongewijzigd
3. **Variant flow**: Upload 3 intro variants voor home kit → check alle 3 in metadata
4. **AI generatie**: Trigger AI asset met role → check opslag onder `roles.{role}`
5. **Lineup**: Maak lineup met keeper + spelers → check correcte assets per positie
6. **Selectie overzicht**: Check completeness dots per rol

### Deploy Draaiboek

**Pre-deploy checklist:**
- [ ] `pytest` groen op feature branch
- [ ] `npx tsc --noEmit` groen
- [ ] `npx vite build` succesvol
- [ ] `migrate_asset_metadata --dry-run` lokaal getest
- [ ] Backup gemaakt van productie metadata

**Stap 1: Deploy nieuwe code**
```bash
# Push to main → Railway auto-deploy
git push origin main
# Wacht tot deploy klaar is
railway logs 2>&1 | Select-String "Listening on"
```

**Stap 2: Pause Celery workers**
```bash
# Via Railway dashboard of CLI
# Celery worker en beat pauzeren
railway link -s celery-worker
# Scale to 0 replicas of send SIGTERM
```

**Stap 3: Run migratie**
```bash
# Via public DB URL (niet railway run)
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
$env:DJANGO_SETTINGS_MODULE = "config.settings.seeding"
python manage.py migrate_asset_metadata --dry-run  # Check eerst
python manage.py migrate_asset_metadata             # Echte migratie
python manage.py verify_asset_metadata              # Verificatie
```

**Stap 4: Resume Celery workers**
```bash
# Scale back up of herstart
railway link -s celery-worker
# Herstart service
```

**Stap 5: Verify**
```bash
# Check logs
railway link -s backend
railway logs 2>&1 | Select-String "error|Error|500"

# Check een paar memberships via API
# Check frontend werkt correct
```

### Rollback procedure

```bash
# Als er iets misgaat:
# 1. Revert code
git revert HEAD
git push origin main

# 2. Restore metadata (als migratie al gedraaid)
python manage.py restore_legacy_assets  # Leest _legacy_assets terug

# 3. Herstart workers
```

### `restore_legacy_assets` command

```python
# Leest _legacy_assets en zet metadata terug naar origineel
# Alleen nodig als rollback na migratie
```

## Checklist

- [ ] E2E tests geschreven en groen
- [ ] Deploy draaiboek getest in staging/lokaal
- [ ] `--dry-run` op productiedata succesvol
- [ ] Rollback procedure gedocumenteerd en getest
- [ ] `restore_legacy_assets` command werkt
- [ ] Monitoring: geen 500s na deploy
- [ ] Frontend werkt correct met nieuwe data
