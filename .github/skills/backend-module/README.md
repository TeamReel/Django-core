# Backend Module Builder

Bouw complete Django apps vanuit een module-spec — van discovery tot productie, met kwaliteits-gates geïnspireerd door spec-kitty.

---

## Snel starten

Zeg simpelweg:

```
build module B62
```

of in het Nederlands:

```
implementeer B50
bouw B46
```

De agent pakt het op, leest de spec, scant op onduidelijkheden, checkt conventies, splitst op in fases, en bouwt het — stap voor stap.

---

## Hoe werkt het?

```
Jij: "build module B62"
  │
  ├─ Gate 0: Discovery
  │   ├─ Leest de spec uit docs/roadmap/backlog/{fase}/todo/
  │   ├─ Scant op onduidelijkheden (models, relaties, endpoints, permissies...)
  │   └─ Stelt 1-5 vragen in één keer (met defaults die je kunt bevestigen)
  │
  ├─ Gate 1: Conventie Check
  │   ├─ UUID PK, timestamps, org FK?
  │   ├─ Drie-serializer patroon?
  │   ├─ Org-scoped querysets?
  │   ├─ Soft delete patroon?
  │   └─ Flagged violations → voorstellen voor fixes
  │
  ├─ Gate 2: Faseplan
  │   ├─ Automatisch opsplitsen (klein=3, medium=4, groot=5 fases)
  │   ├─ Plan tonen met files per fase
  │   └─ ⏸️  Wacht op jouw "go" / "doe maar"
  │
  ├─ Fasen uitvoeren
  │   ├─ Files aanmaken vanuit templates
  │   ├─ Modellen, serializers, views, tests invullen
  │   ├─ Na elke fase: progressie-update
  │   └─ Laatste fase: tests draaien
  │
  ├─ Gate 3: Verificatie
  │   ├─ python manage.py check
  │   ├─ makemigrations --check --dry-run
  │   ├─ pytest src/<app>/tests/ -v
  │   └─ Self-review (N+1 queries, conventies, test coverage)
  │
  └─ Gate 4: Spec updaten
      └─ Module spec status → ✅ IMPLEMENTED
```

---

## Gates vs. spec-kitty

| Aspect | spec-kitty | Module Builder |
|--------|-----------|----------------|
| **Scope** | Elk type feature (frontend, backend, full-stack) | Alleen backend Django modules |
| **Worktrees** | Ja — aparte git worktree per feature | Nee — werkt direct op main |
| **Branching** | Feature branch → review → merge | Direct op main (kleine scope) |
| **Ambiguity scan** | ✅ specify + clarify prompts | ✅ Gate 0 (dezelfde checks) |
| **Constitution** | ✅ constitution prompt | ✅ Gate 1 (backend + API + safety + test conventies) |
| **Fasing** | ✅ plan + tasks prompts | ✅ Gate 2 (auto-split op complexiteit) |
| **Verificatie** | ✅ analyze prompt | ✅ Gate 3 (pytest + django check + self-review) |
| **Code templates** | Nee (handmatig) | ✅ 13 templates voor consistente structuur |

**TL;DR:** Hetzelfde kwaliteitsniveau als spec-kitty, maar sneller en specifieker voor backend modules.

---

## Wat wordt automatisch gecheckt?

### Gate 0 — Ambiguity Scan

De agent scant je spec op 7 categorieën:

| Check | Voorbeeld vraag als het onduidelijk is |
|-------|---------------------------------------|
| **Models** | "Welke velden heeft ScheduledPost precies?" |
| **Relaties** | "Is de FK naar Activity CASCADE of SET_NULL?" |
| **Endpoints** | "Wil je ook een bulk-create endpoint?" |
| **Permissies** | "Mag een gewone user publiceren, of alleen staff?" |
| **Integraties** | "Moet dit koppelen met Celery voor scheduling?" |
| **Edge cases** | "Wat als een activity al gepubliceerd is en dan gewijzigd?" |
| **Async taken** | "Moet de publicatie op achtergrond draaien via Celery?" |

Als de spec helder genoeg is → slaat Gate 0 de vragen over.

### Gate 1 — Conventie Check

4 checklists worden doorlopen:

- **Backend**: UUID PK, timestamps, org FK, soft delete, JSON metadata
- **API**: Drie-serializer patroon, org-scoped querysets, pagination, select_related
- **Safety**: Nullable nieuwe velden, geen DROP TABLE, geen raw SQL
- **Tests**: pytest, django_db marker, conftest fixtures, boundary tests

Violations worden geflagged en opgelost **vóórdat** er code geschreven wordt.

---

## Automatisch faseren

De agent bepaalt de complexiteit van je module:

| Complexiteit | Criteria | Fases |
|-------------|---------|-------|
| **Klein** | 1-2 modellen, basis CRUD | 3 fases (~15 min) |
| **Medium** | 3-4 modellen, custom actions | 4 fases (~30 min) |
| **Groot** | 5+ modellen, Celery, integraties | 5 fases (~45 min) |

### Voorbeeld faseplan (medium)

```
📋 Module B50 — Scheduled Publishing

Models: ScheduledPost, PublishLog
Endpoints: 6 endpoints across 2 viewsets
Tests: ~24 test cases
Phases: 4

Phase 1: Core models + Migration + Admin       → models.py, admin.py, apps.py
Phase 2: Primary API (ScheduledPost CRUD)       → serializers.py, views.py, urls.py
Phase 3: Secondary API + Celery tasks           → tasks.py, services.py, signals.py
Phase 4: Tests + Wire-up + Verify               → tests/, urls registration

Doorgaan? (ja / aanpassen)
```

Je kunt altijd zeggen "aanpassen" om fases te herordenen of samenvoegen.

---

## File structuur

### Wat de builder maakt

```
src/<app>/
  __init__.py          # Module docstring: "B62: Activity Feed"
  README.md            # Module documentatie (VERPLICHT)
  apps.py              # AppConfig met ready() voor signals
  models.py            # UUID PK, timestamps, org FK, soft delete
  admin.py             # list_display, filters, search, inlines
  managers.py          # Custom querysets (indien nodig)
  services.py          # Business logic (indien nodig)
  signals.py           # Signal handlers (indien nodig)
  tasks.py             # Celery taken (indien nodig)
  api/
    __init__.py
    serializers.py     # List / Detail / Write serializers
    views.py           # Org-scoped ViewSet
    urls.py            # SimpleRouter
    permissions.py     # RBAC-aware permissions
  tests/
    __init__.py
    conftest.py        # Fixtures: user, org, member, project + module-specifiek
    test_models.py     # Creatie, __str__, constraints, soft delete
    test_api.py        # CRUD, filtering, pagination, org isolation
    test_serializers.py # Read/write, validation, nested velden
    test_permissions.py # Auth, roles, owner, non-owner grenzen
```

### Systeem bestanden

```
.github/
  agents/module-builder.agent.md       # Agent definitie
  skills/backend-module/
    SKILL.md                           # Hoofd-playbook (4 gates)
    README.md                          # ← dit bestand
    templates/                         # 13 code templates
      __init__.py.tpl
      apps.py.tpl
      models.py.tpl
      admin.py.tpl
      serializers.py.tpl
      views.py.tpl
      urls.py.tpl
      permissions.py.tpl
      conftest.py.tpl
      test_models.py.tpl
      test_api.py.tpl
      test_serializers.py.tpl
      test_permissions.py.tpl
  prompts/build-module.prompt.md       # Quick trigger
```

---

## Voorbeelden

### Simpel module bouwen
```
build module B46
```
→ Soft Delete module, klein (1 mixin-model), 3 fases, ~15 minuten.

### Complex module bouwen
```
build module B64
```
→ Realtime Updates, groot (WebSocket transport + event models + Celery), 5 fases, ~45 minuten.

### Module bouwen met aanpassingen
```
build module B62, maar skip de Celery tasks voor nu
```
→ Agent bouwt Activity Feed zonder tasks.py, noteert dit in de spec.

### Alleen fase 1
```
build module B50, alleen fase 1
```
→ Agent maakt alleen models + migration + admin, stopt daarna.

---

## Na het bouwen

De agent stelt automatisch de volgende stap voor:

- "Wil je dat ik de code review?" → Handoff naar Reviewer agent
- "Zal ik de queries checken?" → Handoff naar PostgreSQL DBA agent
- "Nog een module bouwen?" → Volgende B-module
- "Commit maken?" → Conventional commit met module scope

---

## Troubleshooting

| Probleem | Oplossing |
|---------|----------|
| "Spec niet gevonden" | Check of het item in `docs/roadmap/backlog/{fase}/todo/` staat |
| "Gate 1 faalt" | Spec voldoet niet aan conventies — agent stelt fixes voor |
| "Tests falen" | Agent fixt automatisch, of vraagt jou om input bij onduidelijkheden |
| "Import error" | App niet geregistreerd in INSTALLED_APPS — wire-up fase overgeslagen? |
| "Migration conflict" | Voer `makemigrations --merge` uit |
