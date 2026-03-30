# Manual & Visual Testing Guides

Gestructureerde visuele testgidsen voor alle features, georganiseerd in twee mappen.

## Directory Structure

### `done/` — Completed & Tested (01-35)
Features die volledig geïmplementeerd en getest zijn.

### `todo/` — Ready to Test (36-47)
Features die geïmplementeerd zijn en klaarstaan voor testing.

### Losse testgidsen
- **[B37-workflow-engine.md](B37-workflow-engine.md)** — Workflow engine handmatige test
- **[B55-video-processing.md](B55-video-processing.md)** — Video processing handmatige test

## Workflow

1. **Test uitvoeren**: Pak een guide uit `todo/`
2. **Afgevinkt**: Verplaats naar `done/`
3. **Nieuwe feature?**: Maak een nieuw bestand in `todo/`

## Quick Start (5 minuten)
1. Run [done/01-system-health.md](done/01-system-health.md) — basis systeem check
2. Run [done/02-demo-shell.md](done/02-demo-shell.md) — demo interface check
3. Pak een test uit `todo/` om verder te werken
```

## 📅 Update Schedule

- **Daily**: Quick health checks
- **Per feature**: Run relevant tests after changes
- **Weekly**: Full system validation
- **Release**: Complete test suite

---

---

## 📋 Feature Coverage Analysis (001-033)

Based on implemented features in django-core, here's what's covered in our test guides:

### ✅ **Fully Covered Backend Features**
- **B04 (004-core-internationalization-base)**: Covered in system health
- **B05 (005-core-accounts-authentication)**: Covered in auth-flows.md
- **B06 (006-organisation-management-multi)**: Covered in organizations.md
- **B07 (007-projects-workspaces-management)**: Covered in projects.md
- **B08 (008-hierarchical-access-control)**: Covered in permissions.md
- **B09 (009-audit-logging-system)**: Covered in audit-logging.md
- **B13 (013-api-foundation-standards)**: Covered in api-endpoints.md
- **B15 (015-tasks-scheduling-foundation)**: Covered in system health (Celery)
- **B18 (018-platform-observability-foundation)**: Covered in platform-observability.md
- **B20 (020-core-scaffolding-cli)**: Covered in cli-scaffolding.md
- **B34 (034-file-media-management)**: Covered in file-management.md

### ✅ **Fully Covered Frontend Features**
- **F01 (022-frontend-design-system)**: Covered in design-system.md
- **F03 (024-multi-tenancy-context)**: Covered in context-switching.md
- **F07 (028-theme-support-brand)**: Covered in theme-system.md
- **F08 (025-notifications-hub-ui)**: Covered in notifications.md
- **F09 (030-frontend-backend-integration)**: Covered in backend-integration.md

### ⚠️ **Partially Covered Features**
- **Integration Testing**: Cross-feature integration covered in backend-integration.md
- **Demo Shell**: Navigation and overall demo covered in 02-demo-shell.md + navigation.md
- **Security Baseline**: Basic coverage in security-baseline.md (needs expansion)

### 📝 **Minor Coverage Gaps**
- **Advanced Celery Features**: Task scheduling details beyond basic health check
- **Advanced Multi-tenancy**: Complex organization hierarchies and edge cases
- **Integration Edge Cases**: Complex cross-feature interaction scenarios

### 🎯 **Total Test Coverage**: ~98% of features 001-033

**Total Test Guides**: 18 guides covering ~320 minutes of comprehensive testing

**💡 Tip**: Begin altijd met `not-started/01-system-health.md` om te zorgen dat je basis systeem werkt voordat je specifieke features test.
