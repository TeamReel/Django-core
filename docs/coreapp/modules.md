# Core Platform Modules

> Alle Django apps die het 80% core platform vormen.

---

## Identity & Access Control

### accounts
User model, authenticatie, JWT tokens, password reset.
- **Models:** User, UserProfile
- **Migrations:** 7
- **Key:** Basis voor alle authenticatie

### organisations
Multi-tenant root. Elke gebruiker hoort bij één of meer organisaties.
- **Models:** Organisation, Membership
- **Migrations:** 4
- **Key:** `Membership` koppelt users aan organisaties met rollen

### projects
Hiërarchische structuur: clubs → teams. Nested via `parent_project`.
- **Models:** 13 (Project, ProjectMembership, Member, Period, etc.)
- **Migrations:** 17
- **Key:** Dit is de grootste app — bevat ook Members en Periods

### permissions
RBAC systeem met rollen, permissies en assignments.
- **Models:** Role, Permission, RoleAssignment, PermissionRegistry
- **Migrations:** 1
- **Key:** Hiërarchische permissies (org → project → resource level)

---

## Data & Storage

### files
S3-gebaseerd bestandsbeheer met metadata en thumbnails.
- **Models:** FileAsset
- **Migrations:** 2
- **Key:** Alle uploads gaan via FileAsset → S3

### search
Full-text zoeken via PostgreSQL `SearchVector`.
- **Models:** SearchIndex
- **Migrations:** 3
- **Key:** Geen Elasticsearch nodig — PostgreSQL native search

### trash
Soft delete met herstel-mogelijkheid.
- **Models:** TrashedItem
- **Migrations:** 1

### audit
Audit trail voor alle relevante wijzigingen.
- **Models:** AuditLog
- **Migrations:** 2
- **Key:** Automatisch via middleware/signals

---

## Communication

### notifications
Multi-channel notificatiesysteem met gebruikersvoorkeuren.
- **Models:** 6 (Notification, NotificationChannel, NotificationPreference, etc.)
- **Migrations:** 4

### contextual_notifications
Context-aware notificaties gekoppeld aan specifieke objecten.
- **Models:** 5
- **Migrations:** 3

---

## Processing

### tasks
Celery task monitoring en management.
- **Models:** — (gebruikt Celery task registry)
- **Key:** TasksPage in frontend toont running/completed tasks

### Celery Queues
| Queue | Worker | Concurrency | Taken |
|-------|--------|-------------|-------|
| `default` | celery-worker | 2 | Thumbnails, notificaties, lichte taken |
| `video_fast` | celery-worker | 2 | Snelle video jobs |
| `video_slow` | video-worker | 1 | RVM, transcoding, compositie |
| `ai_generation` | worker-ai | 1 | Gemini/MiniMax API calls |

---

## Commerce

### credits
Credit balance systeem voor verbruiksbeheer.
- **Models:** CreditBalance, CreditPackage, CreditTopUp
- **Migrations:** 5

### transactions
Transactie log en usage events.
- **Models:** 6 (Transaction, UsageEvent, etc.)
- **Migrations:** 3

---

## Operations

### observability
Health metrics en monitoring endpoints.
- **Models:** HealthMetric
- **Migrations:** 1

### settings
Gebruikers- en organisatie-instellingen.
- **Models:** 4 (UserPreference, OrganisationSettings, FeatureFlag, etc.)
- **Migrations:** 6

### navigation
Sidebar configuratie, breadcrumbs, recents/favorites.
- **Models:** 3
- **Migrations:** 1

---

## Governance

### constitution_engine
Code quality rules engine. Geen database models — puur in-code governance.
- **Key:** Enforces coding standards, wordt gebruikt door CI checks

### security_baseline
Security rules en validatie.
- **Key:** OWASP-gebaseerde security checks

### i18n_preferences
Internationalisatie middleware en API voor taalvoorkeuren.
- **Key:** Middleware-based, geen eigen models

---

## Utility Apps

### common
Gedeelde utilities: health check endpoint, base managers.
- **Status:** Minimaal gebruik

### api
DRF foundation: pagination, error handling, base viewsets.
- **Key:** Basis voor alle API endpoints

### scaffolding
Management commands voor code generatie.
- **Key:** `python manage.py scaffold_app`, etc.

---

## Samenvatting

| Categorie | Apps | Models |
|-----------|------|--------|
| Identity & Access | 4 | 21 |
| Data & Storage | 4 | 4 |
| Communication | 2 | 11 |
| Processing | 1 | — |
| Commerce | 2 | 9 |
| Operations | 3 | 8 |
| Governance | 3 | — |
| Utility | 3 | — |
| **Totaal Core** | **22** | **~53** |
