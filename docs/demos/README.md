# Demo Environment Setup

Quick-start demo environments with realistic seed data for development and testing.

## Profiles

### 🚀 Demo Profile (PostgreSQL + Auto-Seed)
**Purpose**: Full production-like experience with PostgreSQL and automatic data seeding
**Startup**: <60 seconds
**Use case**: Product demos, E2E testing, feature validation

```bash
docker-compose -f docker-compose.demo.yml --profile demo up
```

**Services**:
- PostgreSQL 13 (port 5433)
- Redis 6 (port 6380)
- Django web app (port 8080)
- Celery worker + beat

**Auto-seeded data**:
- 5 organizations
- 20 users (demo accounts with password `Demo2024!`)
- 80 projects (distributed across orgs)
- 200-300 audit events
- Transaction history (last 30 days)
- Notifications (5-10 unread per account)

### ⚡ Demo-Lite Profile (SQLite + Manual Seed)
**Purpose**: Fast startup for frontend development, no PostgreSQL overhead
**Startup**: <30 seconds
**Use case**: Quick frontend iteration, lightweight testing

```bash
docker-compose -f docker-compose.demo.yml --profile demo-lite up
```

**Services**:
- SQLite database (file-based)
- Redis 6 (port 6380)
- Django web app (port 8081)
- Celery worker + beat

**Manual seeding required**:
```bash
docker exec -it <container-name> python manage.py seed_demo_data
```

## Quick Start

### 1. Copy Environment Template
```bash
cp .env.demo .env.demo.local
# Edit .env.demo.local if needed (optional)
```

### 2. Start Demo Profile
```bash
docker-compose -f docker-compose.demo.yml --profile demo up --build
```

### 3. Access Application
- **Web UI**: http://localhost:8080
- **Admin**: http://localhost:8080/admin
- **API**: http://localhost:8080/api/v1/

### 4. Login with Demo Account
```
Email: admin@demo.djangocore.app
Password: Demo2024!
```

## Configuration

### Environment Variables

Key settings in `.env.demo` (or `.env.demo.local`):

```bash
# Auto-seed behavior
DEMO_AUTO_SEED=true              # Enable auto-seed on startup
DEMO_RESET_ON_START=false        # ⚠️ Wipe data on restart (testing only)
DEMO_RANDOM_SEED=12345           # Deterministic data generation

# Database settings
DEMO_DB_NAME=django_core_demo
DEMO_DB_USER=demo
DEMO_DB_PASSWORD=Demo2024!
DEMO_DB_PORT=5433

# Connection pooling (pgbouncer-ready)
CONN_MAX_AGE=600                 # Connection lifetime (seconds)
DB_POOL_PRE_PING=True            # Test connections before use

# Ports (avoid conflicts with local dev)
DEMO_WEB_PORT=8080               # Demo profile
DEMO_LITE_WEB_PORT=8081          # Demo-lite profile
DEMO_REDIS_PORT=6380
```

## Management Commands

### Seed Data
```bash
# Seed demo data (idempotent - safe to rerun)
docker exec -it <container> python manage.py seed_demo_data

# Seed with JSON output (for automation)
docker exec -it <container> python manage.py seed_demo_data --json

# Seed with verbose logging
docker exec -it <container> python manage.py seed_demo_data --verbose
```

### Validate Data
```bash
# Check data integrity
docker exec -it <container> python manage.py validate_demo_data

# Validation with JSON output
docker exec -it <container> python manage.py validate_demo_data --json
```

### Reset Data
```bash
# ⚠️ DANGEROUS: Wipe and reseed demo data
docker exec -it <container> python manage.py reset_demo_data --force

# Reset without reseeding (wipe only)
docker exec -it <container> python manage.py reset_demo_data --force --no-seed
```

## Demo Accounts

All demo accounts use password: `Demo2024!`

### Superuser
- `admin@demo.djangocore.app` - Full system access

### Organization Admins (5 accounts)
- `admin@techventures.djangocore.app` - TechVentures Admin
- `admin@datalab.djangocore.app` - DataLab Innovations Admin
- `admin@devopsguild.djangocore.app` - DevOps Guild Admin
- `admin@cloudstream.djangocore.app` - CloudStream Solutions Admin
- `admin@agileconsulting.djangocore.app` - Agile Consulting Group Admin

### Managers (5 accounts)
- `manager@{org}.djangocore.app` - One per organization

### Members (5 accounts)
- `user@{org}.djangocore.app` - One per organization

### Viewers (5 accounts)
- `viewer@{org}.djangocore.app` - One per organization (read-only)

## Expected Dataset

After seeding, the database contains:

| Entity | Count | Details |
|--------|-------|---------|
| Organizations | 5 | TechVentures, DataLab, DevOps Guild, CloudStream, Agile Consulting |
| Users | 20 | 4 per org (admin, manager, member, viewer) |
| Projects | 80 | 15/30/10/5/20 per org, ~80% active, ~20% archived |
| Audit Events | 200-300 | Seeded range, various types (auth/crud/financial/security) |
| Transactions | Variable | Last 30 days, purchase/usage/refund mix |
| Notifications | 5-10 unread | Per demo account, 50+ read per org |

**Database size**: ~50MB after full seed

## Performance Targets

| Operation | Target | Actual (typical) |
|-----------|--------|------------------|
| Demo startup (PostgreSQL + seed) | <60s | ~30-40s |
| Demo-lite startup (SQLite, no seed) | <30s | ~15-20s |
| Seed command (first run) | <30s | ~5-10s |
| Seed command (rerun, idempotent) | <5s | <1s |
| Validate command | N/A | <1s |
| Reset command (wipe + reseed) | <60s | ~5-10s |

## Verification Checklist

After startup, verify demo environment:

```bash
# 1. Check web is accessible
curl http://localhost:8080/health/live

# 2. Validate data integrity
docker exec -it <container> python manage.py validate_demo_data

# 3. Check organization count
docker exec -it <container> python manage.py shell -c "from organisations.models import Organisation; print(Organisation.objects.count())"

# 4. Check user count
docker exec -it <container> python manage.py shell -c "from accounts.models import User; print(User.objects.count())"

# 5. Check project count
docker exec -it <container> python manage.py shell -c "from projects.models import Project; print(Project.all_objects.count())"
```

Expected output:
- Health check: HTTP 200
- Validation: 0 violations
- Organizations: 5
- Users: 20
- Projects: 80

## Connection Pooling (pgbouncer)

The demo profile is configured for connection pooling with pgbouncer:

### Current Configuration (Direct PostgreSQL)
```yaml
environment:
  - DATABASE_URL=postgresql://demo:Demo2024!@db-demo:5432/django_core_demo
  - CONN_MAX_AGE=600          # 10 minute connection lifetime
  - DB_POOL_PRE_PING=True     # Test connections before use
```

### Future pgbouncer Integration

To add pgbouncer service (optional, for production-like testing):

1. **Add pgbouncer service** to `docker-compose.demo.yml`:
```yaml
  pgbouncer:
    image: edoburu/pgbouncer:1.18
    profiles: ["demo"]
    environment:
      - DB_HOST=db-demo
      - DB_PORT=5432
      - DB_USER=demo
      - DB_PASSWORD=Demo2024!
      - POOL_MODE=session
      - MAX_CLIENT_CONN=100
      - DEFAULT_POOL_SIZE=25
      - RESERVE_POOL_SIZE=5
      - SERVER_RESET_QUERY=DISCARD ALL
    ports:
      - "6432:6432"
    depends_on:
      - db-demo
```

2. **Update web service** DATABASE_URL:
```yaml
  web-demo:
    environment:
      - DATABASE_URL=postgresql://demo:Demo2024!@pgbouncer:6432/django_core_demo
```

3. **Configure Django** settings for pooling:
```python
DATABASES['default']['CONN_MAX_AGE'] = 600  # Keep connections alive
DATABASES['default']['OPTIONS'] = {
    'connect_timeout': 10,
    'server_reset_query': 'DISCARD ALL',  # Match pgbouncer setting
}
```

### Pooling Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `CONN_MAX_AGE` | 600 | Keep connections alive 10 minutes |
| `POOL_MODE` | session | One server connection per client session |
| `MAX_CLIENT_CONN` | 100 | Maximum client connections |
| `DEFAULT_POOL_SIZE` | 25 | Connections per database |
| `RESERVE_POOL_SIZE` | 5 | Reserved connections for urgent queries |
| `SERVER_RESET_QUERY` | DISCARD ALL | Clean connection state between uses |

## Read Replica Configuration (Future)

Template for production read replica setup (not deployed in demo):

### Environment Variables
```bash
# Primary database (writes)
DATABASE_URL=postgresql://demo:Demo2024!@db-demo:5432/django_core_demo

# Read replica (reads only - FUTURE)
DATABASE_URL_READONLY=postgresql://demo_ro:ReadOnly2024!@db-replica:5432/django_core_demo
READ_REPLICA_ENABLED=False  # Set to True when replica deployed
```

### Django DATABASES Configuration
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        # ... primary config
    },
    'read_replica': {
        'ENGINE': 'django.db.backends.postgresql',
        # ... replica config (when available)
    },
}

DATABASE_ROUTERS = ['config.routers.ReadReplicaRouter']
```

**Note**: Read replica is for production optimization. Demo profile uses single primary database.

## Troubleshooting

### Port Conflicts
```bash
# Check if ports are in use
netstat -an | findstr "8080 5433 6380"

# Change ports in .env.demo.local
DEMO_WEB_PORT=8090
DEMO_DB_PORT=5434
DEMO_REDIS_PORT=6381
```

### Seed Fails
```bash
# Check database connection
docker exec -it <db-container> pg_isready -U demo

# Check logs
docker logs <web-container>

# Manual migration + seed
docker exec -it <container> python manage.py migrate
docker exec -it <container> python manage.py seed_demo_data --verbose
```

### Reset Not Working
```bash
# Ensure --force flag is provided
docker exec -it <container> python manage.py reset_demo_data --force

# Check for permission errors
docker exec -it <container> python manage.py validate_demo_data
```

### Container Won't Start
```bash
# Check health status
docker ps -a

# Inspect logs
docker logs <container-name>

# Rebuild containers
docker-compose -f docker-compose.demo.yml --profile demo down -v
docker-compose -f docker-compose.demo.yml --profile demo up --build
```

## Development Workflow

### 1. Start Demo Environment
```bash
docker-compose -f docker-compose.demo.yml --profile demo up
```

### 2. Make Code Changes
- Code changes hot-reload automatically (volume mounted)
- No container rebuild needed for Python changes

### 3. Test Changes
```bash
# Run tests
docker exec -it <container> pytest

# Check specific functionality
docker exec -it <container> python manage.py <command>
```

### 4. Reset Data if Needed
```bash
docker exec -it <container> python manage.py reset_demo_data --force
```

### 5. Stop Environment
```bash
docker-compose -f docker-compose.demo.yml --profile demo down

# Or stop and remove volumes (fresh start)
docker-compose -f docker-compose.demo.yml --profile demo down -v
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start demo environment
        run: |
          cp .env.demo .env.demo.local
          docker-compose -f docker-compose.demo.yml --profile demo up -d

      - name: Wait for healthy
        run: |
          timeout 60 bash -c 'until docker exec django-core-demo python manage.py validate_demo_data; do sleep 2; done'

      - name: Run E2E tests
        run: |
          docker exec django-core-demo pytest tests/e2e/

      - name: Cleanup
        if: always()
        run: docker-compose -f docker-compose.demo.yml --profile demo down -v
```

## Notes

- **Port Selection**: Ports 5433, 6380, 8080 avoid conflicts with local development (5432, 6379, 8000)
- **Data Persistence**: Volumes `postgres_demo_data` and `sqlite_demo_data` persist across restarts
- **Security**: Use demo environment only for development/testing, never in production
- **Performance**: SSD recommended for optimal performance, HDD may be slower
- **Resources**: Minimum 4GB RAM recommended for demo profile

## Related Documentation

- [Quickstart Guide](../kitty-specs/032-demo-production-database/quickstart.md)
- [Management Commands Contract](../kitty-specs/032-demo-production-database/contracts/management-commands.md)
- [Implementation Plan](../kitty-specs/032-demo-production-database/plan.md)
- [Feature Specification](../kitty-specs/032-demo-production-database/spec.md)
