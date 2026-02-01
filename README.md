# Django Core

Enterprise-ready Django foundation with authentication, organizations, projects, hierarchical access control, audit logging, and security baseline.

## Quick Links

| Getting Started | Development | Reference |
|-----------------|-------------|-----------|
| [Quickstart](docs/getting-started/quickstart.md) | [Contributing](docs/contributing/index.md) | [Architecture](docs/architecture/overview.md) |
| [Prerequisites](docs/getting-started/prerequisites.md) | [Code Style](docs/contributing/code-style.md) | [API Modules](docs/modules/index.md) |
| [First Contribution](docs/getting-started/first-contribution.md) | [Testing Guide](docs/contributing/testing.md) | [ADRs](docs/adr/) |
| [Project Structure](docs/getting-started/project-structure.md) | [Spec Kitty](docs/contributing/spec-kitty-workflow.md) | [Troubleshooting](docs/troubleshooting/index.md) |

## Documentation

See [docs/INDEX.md](docs/INDEX.md) for:
- **Demo & Testing**: Database status, seeding guides, smoke tests.
- **Go-Live**: Checklists, readiness criteria, deployment artifacts.
- **Infrastructure**: Railway setup and configuration.

## Examples

| Example | Description |
|---------|-------------|
| [CRUD API](examples/crud-api/) | Complete REST API implementation with DRF |
| [Background Tasks](examples/background-tasks/) | Celery task patterns and scheduling |
| [Scaffolding Demo](examples/scaffolding-demo/) | Template-based code generation |

---

## Core Capabilities

Django Core-App is a modular platform providing reusable, product-agnostic infrastructure. This list illustrates the primary modular components currently available in the core foundation.

| Capability | Description | Documentation |
|------------|-------------|---------------|
| **Authentication** | Email-based auth, password reset, user profiles | [Accounts Module](docs/modules/accounts.md) |
| **Multi-Tenancy** | Organization management with soft deletion | [Organisations Module](docs/modules/organisations.md) |
| **Workspaces** | Project workspaces within organizations | [Projects Module](docs/modules/projects.md) |
| **Access Control** | Hierarchical RBAC (Org → Project) | [Permissions Module](docs/modules/permissions.md) |
| **Audit Logging** | Immutable audit trail for system activity | [Audit Module](docs/modules/audit.md) |
| **Brand Identity** | Centralized brand tokens & assets with merge inheritance | [Branding Module](src/branding/README.md) |
| **Transactions** | Double-entry ledger for credits/billing | [Transactions Module](docs/modules/transactions.md) |
| **Notifications** | Multi-channel delivery (Email, In-App, Webhook) | [Notifications Module](docs/modules/notifications.md) |
| **Observability** | Health checks, metrics, and structured logging | [Observability Feature](docs/features/observability/overview.md) |
| **Scaffolding** | CLI for generating production-ready apps | [Scaffolding Guide](docs/scaffolding/cli-guide.md) |
| **Security** | Constitutional enforcement and ASVS reporting | [Security Index](docs/security/index.md) |

For a complete list of features and modules, see [Features](docs/features/index.md) and [Modules](docs/modules/index.md).

---

## Getting Started

### Quick Setup

**Option A: Docker (Recommended)**

```bash
git clone https://github.com/TeamReel/django-core.git
cd django-core
cp .env.example .env
docker-compose -f docker-compose.local.yml up
```

Visit [http://localhost:8000](http://localhost:8000) - you're ready!

**Option B: Local Python**

See the [Full Quickstart Guide](docs/getting-started/quickstart.md) for detailed instructions.

---

## Development

### Running Quality Checks

```bash
pytest                        # Run tests
pytest --cov=src             # With coverage
mypy src/                    # Type checking
ruff check src/              # Linting
black src/                   # Formatting
pre-commit run --all-files   # All checks
```

📚 **[First Contribution](docs/getting-started/first-contribution.md)** | **[Testing Guide](docs/contributing/testing.md)** | **[Code Style](docs/contributing/code-style.md)**

---

## Project Structure

```
django-core/
├── src/                          # Django applications (accounts, permissions, audit, etc.)
├── tests/                        # Test suite (mirrors src/)
├── docs/                         # Documentation
├── kitty-specs/                  # Feature specifications
├── examples/                     # Example implementations
├── requirements/                 # Python dependencies
├── k8s/                          # Kubernetes manifests
└── docker-compose.*.yml          # Docker configurations
```

📚 **[Full Project Structure Guide](docs/getting-started/project-structure.md)**

---

## Deployment

### Quick Deploy to Production

**Status**: ✅ Ready for deployment (test pass rate: 99.1%)

#### Backend (Render.com)
1. Push to GitHub
2. Connect repository in Render Dashboard
3. Render auto-detects `render.yaml` and provisions:
   - Django web service
   - PostgreSQL database
   - Redis cache
4. After first deploy, run in Render Shell:
   ```bash
   python src/manage.py migrate
   python src/manage.py createsuperuser
   python src/manage.py seed_default_roles
   python src/manage.py seed_football_data  # Optional demo data
   ```

#### Frontend (Vercel/Netlify)
```bash
cd examples/demo-shell

# Vercel
vercel --prod
# Set VITE_API_BASE_URL=https://your-app.onrender.com in Vercel dashboard

# OR Netlify
netlify deploy --prod
# Set VITE_API_BASE_URL=https://your-app.onrender.com in Netlify dashboard
```

#### Post-Deployment
- **Health Check**: `curl https://your-app.onrender.com/health/`
- **Update CORS**: Add frontend domain to `CORS_ALLOWED_ORIGINS` in Render env vars
- **Test Login**: Visit frontend, login with demo accounts (see [DEMO_SEED.md](DEMO_SEED.md))

**📚 Complete Guide**: [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) | [RELEASE_READINESS.md](RELEASE_READINESS.md)

---

## License

Proprietary - Team Reel
