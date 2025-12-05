# B21 Docs and Examples - Research
*Path: kitty-specs/021-docs-examples/research.md*

**Created**: 2025-12-04
**Purpose**: Analyse van bestaande documentatie en structuur om B21 implementatie te informeren

---

## 1. Huidige Documentatie Inventaris

### 1.1 Root-Level Docs

| Bestand | Inhoud | Actie B21 |
|---------|--------|-----------|
| `README.md` | Uitgebreide feature overzicht, getting started, project structure | **Refactor** - Split naar docs/ secties |
| `CHANGELOG.md` | Release history | **Behouden** - Link vanuit docs |

### 1.2 Bestaande docs/ Structuur

```
docs/
├── adr/                          # 18 ADRs ✓ Goed georganiseerd
├── architecture/                 # Leeg - vullen
│   └── decisions/               # Leeg - ADRs hier consolideren?
├── deployment/                   # ✓ Compleet (14 bestanden)
├── examples/                     # Minimaal (django/, 1 workflow)
├── features/                     # Leeg
├── health/                       # Health reports
├── howto/                        # 1 bestand (security policies)
├── reviews/                      # Leeg
├── scaffolding/                  # ✓ Compleet (5 bestanden)
├── tasks/                        # ✓ Compleet (5 bestanden)
└── [losse bestanden]             # 15 bestanden, ongeorganiseerd
```

### 1.3 Losse Bestanden in docs/ (moet georganiseerd worden)

| Bestand | Categorie B21 | Doel |
|---------|---------------|------|
| `backend-foundation-acceptance.md` | `reviews/` | Review document |
| `billing-integration.md` | `guides/` | Usage guide |
| `cli.md` | `scaffolding/` of verwijderen | Duplicate? |
| `django-adapter.md` | `architecture/` | Technische uitleg |
| `i18n-integration.md` | `guides/` | Usage guide |
| `i18n-preferences.md` | `modules/` | Module doc |
| `notifications-baseline.md` | `modules/` | Module doc |
| `notifications-extension-guide.md` | `guides/` | Extension guide |
| `notifications-troubleshooting.md` | `troubleshooting/` | Troubleshooting |
| `observability.md` | `modules/` | Module doc |
| `observability-extension-guide.md` | `guides/` | Extension guide |
| `observability-troubleshooting.md` | `troubleshooting/` | Troubleshooting |
| `security-audit-wp10.md` | `reviews/` | Audit document |
| `security-checklist.md` | `guides/` of `contributing/` | Checklist |
| `testing.md` | `contributing/` | Test guide voor constitution engine |
| `TESTING_GUIDE.md` | `contributing/` | Test guide voor security baseline |
| `webhook-signature-verification.md` | `guides/` | Usage guide |

---

## 2. Bestaande ADRs (18 stuks)

### Genummerd per Feature

| ADR | Feature | Onderwerp |
|-----|---------|-----------|
| 001 | B03 | Password validation strategy |
| 002 | B08 | Role-based access control |
| 003 | B03 | pip-audit for dependency scanning |
| 004 | B03 | Security enforcement modes |
| 005 | B13 | Routing evaluation order |
| 006 | B03 | Suppression strategy |
| 012 | B10 | Preference storage |
| 013 | B05 | JWT authentication strategy |
| 014 | B13 | URL-based API versioning |
| 016 | B16 | Notification retry policies |
| 019 | B18 | Metric exporter pluggability |
| 020 | B19 | Deployment automation strategy |
| 011-001 | B11 | Single ledger vs double entry |
| 011-002 | B11 | Computed vs stored balance |
| 011-003 | B11 | Idempotency key retention |
| 011-004 | B11 | Redis cache invalidation |
| 021 | B20 | Template discovery mechanism |
| 022 | B20 | Constitutional validation integration |

**Observatie**: ADR nummering is inconsistent (sommige met feature prefix, sommige niet)

---

## 3. Module README's (src/)

Elke module heeft een `README.md`:

| Module | README Status | Documentatie Kwaliteit |
|--------|---------------|------------------------|
| `accounts/` | ✓ Aanwezig | Goed |
| `api/` | ✓ Aanwezig | Basis |
| `audit/` | ✓ Aanwezig | Uitgebreid |
| `common/` | ? | Te checken |
| `config/` | ? | Te checken |
| `constitution_engine/` | ✓ Aanwezig | Uitgebreid |
| `i18n_preferences/` | ✓ Aanwezig | Basis |
| `notifications/` | ✓ Aanwezig | Goed |
| `observability/` | ✓ Aanwezig | Goed |
| `organisations/` | ✓ Aanwezig | Goed |
| `permissions/` | ✓ Aanwezig | Uitgebreid |
| `projects/` | ✓ Aanwezig | Goed |
| `scaffolding/` | ✓ Aanwezig | Uitgebreid |
| `security_baseline/` | ✓ Aanwezig | Uitgebreid |
| `settings/` | ✓ Aanwezig | Basis |
| `tasks/` | ✓ Aanwezig | Goed |
| `transactions/` | ✓ Aanwezig | Uitgebreid |
| `web_ui/` | ? | Te checken |

---

## 4. README.md Analyse

De huidige `README.md` (450+ regels) bevat:

### Secties die naar docs/ moeten

| README Sectie | Doel in docs/ |
|---------------|---------------|
| Features overzicht | `docs/index.md` of `docs/modules/` |
| Technology Stack | `docs/architecture/overview.md` |
| Getting Started | `docs/getting-started/quickstart.md` |
| Development | `docs/contributing/` |
| Project Structure | `docs/getting-started/project-structure.md` |
| Deployment | Link naar `docs/deployment/` |
| Architecture | `docs/architecture/` |
| Configuration | `docs/guides/configuration.md` |
| Observability | Link naar `docs/observability.md` |
| Contributing | `docs/contributing/` |

### README moet blijven bevatten

- Project naam en korte beschrijving
- Badges (CI, coverage, versie)
- Quick links naar documentatie
- License en support info

---

## 5. Bestaande Test Documentatie

| Document | Locatie | Scope |
|----------|---------|-------|
| `docs/testing.md` | docs/ | Constitution Engine testing |
| `docs/TESTING_GUIDE.md` | docs/ | Security Baseline testing |
| Module test folders | tests/ | Per-module tests |

**Gap**: Geen overkoepelende testing guide voor heel Core-App

---

## 6. Gaps Identificatie

### 6.1 Ontbrekende Documentatie

| Categorie | Ontbreekt |
|-----------|-----------|
| **Getting Started** | Quickstart, prerequisites, first contribution |
| **Architecture** | High-level overview, layering, extension points |
| **Guides** | Authentication, permissions, pagination, error handling |
| **Modules** | Geconsolideerde module docs (nu verspreid) |
| **Contributing** | Spec Kitty workflow, code style, PR guidelines |
| **Troubleshooting** | Geconsolideerd (nu per-feature) |

### 6.2 Structuur Problemen

1. **Losse bestanden in docs/**: 15 bestanden zonder folder organisatie
2. **ADR locatie**: docs/adr/ vs docs/architecture/decisions/ (beide bestaan)
3. **Duplicate test docs**: testing.md en TESTING_GUIDE.md
4. **README te groot**: 450+ regels, moet gesplit worden

### 6.3 Ontbrekende Examples

| Example Type | Status |
|--------------|--------|
| CRUD API | ❌ Niet aanwezig |
| Background Tasks | ❌ Niet aanwezig |
| Scaffolding Demo | ❌ Niet aanwezig |
| Smoke Tests | ❌ Niet aanwezig |

---

## 7. Bestaande Inhoud om te Hergebruiken

### 7.1 Kan Direct Verplaatst Worden

| Van | Naar | Actie |
|-----|------|-------|
| `docs/deployment/*` | `docs/deployment/` | Behouden |
| `docs/scaffolding/*` | `docs/scaffolding/` | Behouden |
| `docs/tasks/*` | `docs/tasks/` | Behouden, evt naar modules/ |
| `docs/adr/*` | `docs/adr/` | Behouden, index toevoegen |

### 7.2 Moet Gerefactored Worden

| Van | Naar | Actie |
|-----|------|-------|
| `README.md` Getting Started | `docs/getting-started/` | Extraheren en uitbreiden |
| `README.md` Development | `docs/contributing/` | Extraheren en uitbreiden |
| `docs/*-troubleshooting.md` | `docs/troubleshooting/` | Consolideren |
| `docs/*-extension-guide.md` | `docs/guides/` | Consolideren |

### 7.3 Moet Nieuw Geschreven Worden

- `docs/getting-started/quickstart.md` (uitgebreider dan README)
- `docs/getting-started/first-contribution.md`
- `docs/architecture/overview.md` met Mermaid diagram
- `docs/architecture/layers.md`
- `docs/architecture/extension-points.md`
- `docs/guides/authentication.md`
- `docs/guides/permissions.md`
- `docs/guides/pagination.md`
- `docs/guides/error-handling.md`
- `docs/contributing/spec-kitty-workflow.md`
- `docs/contributing/code-style.md`
- `docs/contributing/pr-guidelines.md`
- `docs/modules/*.md` (consolidatie van README's)
- Alle examples

---

## 8. MkDocs Compatibiliteit Check

### Huidige Status

| Aspect | Status | Actie |
|--------|--------|-------|
| Markdown formaat | ✓ CommonMark + GFM | Compatibel |
| Directory structuur | ⚠️ Ongeorganiseerd | Reorganiseren |
| Index files | ❌ Ontbreken | Toevoegen |
| Nav file | ❌ Ontbreekt | Aanmaken |
| mkdocs.yml | ❌ Ontbreekt | Placeholder aanmaken |
| Assets folder | ❌ Ontbreekt | Aanmaken |
| Relatieve links | ⚠️ Inconsistent | Controleren |

### MkDocs Material Features om te Ondersteunen

- Navigation tabs
- Search
- Code highlighting
- Admonitions (note, warning, etc.)
- Mermaid diagrams
- Table of contents

---

## 9. Aanbevelingen

### 9.1 Prioriteit 1 - Structuur

1. **Maak sectie folders aan** met index.md:
   - `docs/getting-started/`
   - `docs/architecture/`
   - `docs/guides/`
   - `docs/modules/`
   - `docs/contributing/`
   - `docs/troubleshooting/`

2. **Verplaats losse bestanden** naar juiste folders

3. **Maak nav.yml** voor navigatie structuur

### 9.2 Prioriteit 2 - Inhoud

1. **Schrijf getting-started docs** (hoogste impact voor onboarding)
2. **Schrijf architecture overview** met Mermaid
3. **Consolideer module docs** van src/ README's

### 9.3 Prioriteit 3 - Examples

1. **CRUD API example** eerste (meest gevraagd)
2. **Background tasks** tweede
3. **Scaffolding demo** derde

### 9.4 Nice-to-Have

1. Link checker in CI
2. MkDocs preview workflow
3. Auto-generated module index

---

## 10. Conclusie

De huidige documentatie is **functioneel maar ongeorganiseerd**. B21 moet:

1. **Reorganiseren**: 15 losse bestanden → 6 sectie folders
2. **Consolideren**: Verspreidde info → coherente docs
3. **Uitbreiden**: Ontbrekende getting-started, architecture, guides
4. **Voorbeelden toevoegen**: 3 thematische examples met smoke tests
5. **Toekomstbestendig**: MkDocs-ready structuur

**Geschatte effort voor reorganisatie**: 2-3 uur
**Geschatte effort voor nieuwe content**: 15-20 uur
**Totaal B21**: ~25-30 uur (3-4 dagen)

---

**Einde Research Document**
