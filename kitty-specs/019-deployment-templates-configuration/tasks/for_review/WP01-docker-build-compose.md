---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
title: "Docker Build & Compose Templates"
phase: "Phase 1 - Foundational Infrastructure"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "copilot"
shell_pid: "39236"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-03T00:00:00Z"
    lane: "planned"
    agent: "copilot"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-03T10:30:00Z"
    lane: "doing"
    agent: "copilot"
    shell_pid: "39236"
    action: "Started implementation of Docker Build & Compose Templates"
---

# Work Package Prompt: WP01 – Docker Build & Compose Templates

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand feedback and begin addressing it, update `review_status: acknowledged`.
- **Report progress**: Update Activity Log as you address feedback items.

---

## Review Feedback

*[Empty initially. Reviewers will populate this section if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Create production-ready Dockerfile and Docker Compose templates that enable developers to run Django Core-App locally in <5 minutes, in staging environments with full observability, and in production with external PostgreSQL/Redis services.

**Success Criteria**:
- ✅ Multi-stage Dockerfile builds without errors in <10 minutes
- ✅ Local docker-compose stack starts all 5 services (web, db, redis, worker, beat) in <5 minutes
- ✅ Health check endpoints (/health/live, /health/ready) return 200 OK
- ✅ Hot-reload works in local environment (code changes reflect without rebuild)
- ✅ .env.example contains all required variables with clear descriptions
- ✅ Static files collected during Docker build and accessible
- ✅ Non-root user (UID 1000) execution for security (B03 alignment)

---

## Context & Constraints

**Supporting Documents**:
- **Feature Spec**: kitty-specs/019-deployment-templates-configuration/spec.md
- **Implementation Plan**: kitty-specs/019-deployment-templates-configuration/plan.md
- **Research**: kitty-specs/019-deployment-templates-configuration/research.md (Section 1: Docker Multi-Stage Build, Section 4: Docker Compose Variants)
- **Design Contracts**: kitty-specs/019-deployment-templates-configuration/contracts/ (Dockerfile, docker-compose.*.yml, .env.example templates)
- **Constitution**: .kittify/memory/constitution.md (Section V: Security and Privacy, Section VIII: Developer Experience)

**Key Decisions** (from planning):
- Container base images: python:3.12 (dev stage), python:3.12-slim (prod stage)
- WSGI server: Gunicorn with sync workers
- Multi-stage build pattern for optimal image size
- Three Docker Compose variants: local (hot-reload), staging (prod-like), production (external services)

**Constraints**:
- Must use non-root user (UID 1000) for container execution (B03 security baseline)
- Must complete collectstatic during Docker build (static files bundled in image)
- Must expose port 8000 for Gunicorn
- Must integrate B18 health checks in Docker HEALTHCHECK directive
- Must pin all base image versions (python:3.12, postgres:13-alpine, redis:6-alpine)

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create multi-stage Dockerfile
**Purpose**: Build production-ready Docker image with minimal size and security hardening

**Steps**:
1. Copy `kitty-specs/019-deployment-templates-configuration/contracts/Dockerfile` to repository root: `Dockerfile`
2. Verify the Dockerfile structure:
   - **Stage 1 (builder)**: FROM python:3.12, install build dependencies (build-essential, libpq-dev), create venv, install requirements
   - **Stage 2 (production)**: FROM python:3.12-slim, copy venv from builder, create non-root user (django, UID 1000), copy app code, run collectstatic, set USER django
3. Ensure HEALTHCHECK directive uses B18 endpoint: `CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live')"`
4. Verify Gunicorn command in CMD with recommended flags: workers=4, timeout=30, log to stdout

**Files**:
- **Create**: `Dockerfile` (repository root)

**Parallel?**: Yes (can work alongside T002-T006)

**Notes**:
- If requirements/production.txt doesn't exist, create placeholder or adjust path
- Ensure WORKDIR /app matches application structure
- Verify collectstatic --noinput --clear runs successfully (depends on Django settings)

---

### Subtask T002 – Create .dockerignore file
**Purpose**: Exclude unnecessary files from Docker build context for faster builds

**Steps**:
1. Create `.dockerignore` at repository root
2. Include exclusion patterns:
   ```
   .git
   .github
   .gitignore
   .worktrees
   venv
   .venv
   __pycache__
   *.pyc
   *.pyo
   *.pyd
   .pytest_cache
   .coverage
   coverage.json
   *.sqlite3
   .env
   .env.*
   !.env.example
   *.log
   docs/
   kitty-specs/
   README.md
   CHANGELOG.md
   ```
3. Verify .env.example is NOT excluded (use `!.env.example` to include it)

**Files**:
- **Create**: `.dockerignore` (repository root)

**Parallel?**: Yes

**Notes**:
- Excluding large directories (docs/, kitty-specs/) significantly speeds up Docker build
- .env files excluded for security (secrets should never be in images)

---

### Subtask T003 – Create docker-compose.local.yml
**Purpose**: Enable local development with hot-reload, local PostgreSQL/Redis, and debug mode

**Steps**:
1. Copy `kitty-specs/019-deployment-templates-configuration/contracts/docker-compose.local.yml` to repository root
2. Verify service configuration:
   - **db**: postgres:13-alpine, port 5432 exposed, POSTGRES_DB/USER/PASSWORD env vars
   - **redis**: redis:6-alpine, port 6379 exposed
   - **web**: build from Dockerfile (target=builder for dev dependencies), volume mount `.:/app` for hot-reload, port 8000 exposed, command=`python manage.py runserver 0.0.0.0:8000`
   - **celery-worker**: same image as web, command=`celery -A config worker --loglevel=info --concurrency=2`
   - **celery-beat**: same image as web, command=`celery -A config beat --loglevel=info`
3. Ensure all services have DEBUG=True, CELERY_TASK_ALWAYS_EAGER=False
4. Verify health checks on db and redis services
5. Ensure depends_on relationships: web depends on db+redis, workers depend on db+redis

**Files**:
- **Create**: `docker-compose.local.yml` (repository root)

**Parallel?**: Yes

**Notes**:
- Volume mount `.:/app` enables hot-reload (Django runserver detects changes)
- builder target includes dev dependencies if requirements/local.txt exists
- ports exposed for direct access during development (db:5432, redis:6379, web:8000)

---

### Subtask T004 – Create docker-compose.staging.yml
**Purpose**: Staging environment with production-like configuration but local services

**Steps**:
1. Copy `kitty-specs/019-deployment-templates-configuration/contracts/docker-compose.staging.yml` to repository root
2. Verify service configuration:
   - **db**: postgres:13-alpine with password-protected access
   - **redis**: redis:6-alpine with `--requirepass` flag
   - **migrate**: runs `python manage.py migrate --noinput` before web starts
   - **web**: uses production image, Gunicorn command, DEBUG=False, depends on migrate service
   - **nginx**: nginx:1.25-alpine, mounts nginx/staging.conf, exposes port 80, depends on web
   - **celery-worker**: production image, concurrency=4
   - **celery-beat**: production image, single replica
   - **prometheus** (optional): prom/prometheus for testing B18 metrics
3. Ensure all services use DEBUG=False, SECURE_SSL_REDIRECT=False (staging is HTTP)
4. Verify static_volume shared between web and nginx
5. Ensure restart policies: restart: unless-stopped

**Files**:
- **Create**: `docker-compose.staging.yml` (repository root)

**Parallel?**: Yes

**Notes**:
- Uses local PostgreSQL/Redis but production-configured (passwords, restart policies)
- migrate service ensures database up-to-date before web starts
- Nginx reverse proxy tests production-like routing
- Optional Prometheus service for B18 integration testing

---

### Subtask T005 – Create docker-compose.prod.yml
**Purpose**: Production deployment with external PostgreSQL/Redis and full security

**Steps**:
1. Copy `kitty-specs/019-deployment-templates-configuration/contracts/docker-compose.prod.yml` to repository root
2. Verify service configuration:
   - **migrate**: runs before web, uses DOCKER_IMAGE from env
   - **web**: DOCKER_IMAGE from env, Gunicorn with production flags, external DATABASE_URL/REDIS_URL, resource limits
   - **nginx**: mounts nginx/production.conf, SSL certificates from ${SSL_CERT_PATH}, exposes ports 80+443
   - **celery-worker**: replicas=2 (or CELERY_WORKER_REPLICAS env var), resource limits
   - **celery-beat**: replicas=1 (critical: only one beat instance)
3. Ensure all required env vars marked with `:?` (Docker Compose error if missing): SECRET_KEY, DATABASE_URL, REDIS_URL, ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS
4. Verify security settings: DEBUG=False, SECURE_SSL_REDIRECT=True, SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True
5. Ensure deploy.resources section with CPU/memory limits
6. Verify graceful shutdown: terminationGracePeriodSeconds=30 for web, 300 for workers

**Files**:
- **Create**: `docker-compose.prod.yml` (repository root)

**Parallel?**: Yes

**Notes**:
- No local db/redis services (expects external managed services)
- DOCKER_IMAGE env var allows deploying specific image tags
- SSL_CERT_PATH for mounting SSL certificates into Nginx
- Resource limits prevent runaway processes from consuming all resources
- Beat must have exactly 1 replica (multiple beat instances cause duplicate task execution)

---

### Subtask T006 – Create .env.example template
**Purpose**: Provide comprehensive environment variable template with validation documentation

**Steps**:
1. Copy `kitty-specs/019-deployment-templates-configuration/contracts/.env.example` to repository root
2. Verify all variable categories present:
   - **Django Core**: SECRET_KEY, DEBUG, ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS
   - **Database**: DATABASE_URL with format examples (local, AWS RDS, GCP Cloud SQL, Azure)
   - **Redis**: REDIS_URL with format examples (local, AWS ElastiCache, GCP Memorystore, Azure Cache)
   - **Celery (B15)**: CELERY_BROKER_URL, CELERY_WORKER_CONCURRENCY, task timeouts
   - **Security (B03)**: SECURE_SSL_REDIRECT, SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE, HSTS settings
   - **Observability (B18)**: LOGGING_LEVEL, PROMETHEUS_METRICS_ENABLED, SENTRY_DSN
   - **Docker Compose**: DOCKER_IMAGE, DATABASE_NAME/USER/PASSWORD, GUNICORN_WORKERS
3. Ensure each variable has:
   - Clear description comment
   - Format specification (e.g., "postgresql://user:pass@host:port/db")
   - Example values (with placeholders, never real secrets)
   - Validation rules at bottom of file
4. Add cloud provider examples section with connection strings for AWS/GCP/Azure

**Files**:
- **Create**: `.env.example` (repository root)

**Parallel?**: Yes (note: T021-T024 will update this file later with additional variables)

**Notes**:
- SECRET_KEY generation command documented: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- Format validation rules section helps developers validate their .env files
- Cloud provider examples cover AWS RDS, ElastiCache, GCP Cloud SQL, Memorystore, Azure PostgreSQL, Redis Cache

---

### Subtask T007 – Verify Dockerfile builds successfully
**Purpose**: Ensure Docker image builds without errors and completes in <10 minutes

**Steps**:
1. Navigate to repository root
2. Run: `docker build -t django-core:test .`
3. Measure build time (should be <10 minutes on reasonable connection)
4. Verify build output:
   - Stage 1 (builder) completes: dependencies installed
   - Stage 2 (production) completes: non-root user created, code copied, collectstatic successful
5. Inspect final image: `docker images django-core:test` (should be <500MB for slim image)
6. Verify non-root user: `docker run --rm django-core:test whoami` (should output "django", not "root")
7. Verify static files: `docker run --rm django-core:test ls /app/staticfiles/` (should list collected files)

**Files**:
- **None** (verification only)

**Parallel?**: No (depends on T001 completing first)

**Notes**:
- If build exceeds 10 minutes, check network speed (downloading base images) or requirements.txt size
- If collectstatic fails, verify STATIC_ROOT setting in Django config
- If user is root, check USER django directive in Dockerfile

**Depends On**: T001 (Dockerfile must exist)

---

### Subtask T008 – Verify local docker-compose stack starts
**Purpose**: Ensure local development environment starts all services in <5 minutes and passes health checks

**Steps**:
1. Create `.env` file from `.env.example`: `cp .env.example .env`
2. Start services: `docker-compose -f docker-compose.local.yml up`
3. Measure startup time (all services "Up (healthy)" in <5 minutes)
4. Verify all 5 services running: `docker-compose -f docker-compose.local.yml ps`
   - db (healthy)
   - redis (healthy)
   - web (running)
   - celery-worker (running)
   - celery-beat (running)
5. Test health endpoints:
   - `curl http://localhost:8000/health/live` → 200 OK
   - `curl http://localhost:8000/health/ready` → 200 OK
6. Test hot-reload:
   - Edit a Python file (e.g., add comment to a view)
   - Check logs: `docker-compose logs -f web` (should show "Reloading...")
   - Verify change reflected without rebuild
7. Test static files: `curl http://localhost:8000/static/admin/css/base.css` → 200 OK
8. Stop services: `docker-compose -f docker-compose.local.yml down`

**Files**:
- **None** (verification only)

**Parallel?**: No (depends on T003 completing first)

**Notes**:
- If services fail to start, check logs: `docker-compose logs <service>`
- If health checks fail, verify B18 observability app is installed and endpoints configured
- If hot-reload doesn't work, verify volume mount `.:/app` in docker-compose.local.yml
- If static files 404, verify collectstatic ran during Docker build

**Depends On**: T003 (docker-compose.local.yml must exist), T006 (.env.example must exist to create .env)

---

## Risks & Mitigations

**Risk 1**: Dockerfile build exceeds 10-minute target
- **Cause**: Slow network downloading base images, large requirements.txt
- **Mitigation**: Use Docker layer caching, optimize requirements.txt, consider multi-stage build improvements

**Risk 2**: Docker Compose services fail to start (port conflicts)
- **Cause**: PostgreSQL (5432), Redis (6379), or web (8000) ports already in use
- **Mitigation**: Document how to find and kill conflicting processes, or use different ports via env vars

**Risk 3**: Health checks fail despite services running
- **Cause**: B18 observability app not installed or health endpoints not configured
- **Mitigation**: Verify B18 integration complete before this work package, add troubleshooting to docs

**Risk 4**: Hot-reload doesn't work in local environment
- **Cause**: Volume mount incorrect or Docker Desktop file sharing not enabled
- **Mitigation**: Verify `.:/app` volume mount, check Docker Desktop settings (File Sharing)

**Risk 5**: Static files not collected or accessible
- **Cause**: collectstatic fails during build, STATIC_ROOT not configured, Nginx volume mount missing
- **Mitigation**: Verify Django STATIC_ROOT setting, check Dockerfile RUN collectstatic output, verify static_volume in docker-compose

---

## Definition of Done Checklist

- [ ] **T001**: Dockerfile created at repository root with multi-stage build
- [ ] **T002**: .dockerignore created with comprehensive exclusions
- [ ] **T003**: docker-compose.local.yml created with hot-reload configuration
- [ ] **T004**: docker-compose.staging.yml created with Nginx and production-like config
- [ ] **T005**: docker-compose.prod.yml created with external services and resource limits
- [ ] **T006**: .env.example created with all variables and cloud provider examples
- [ ] **T007**: Docker image builds successfully in <10 minutes, non-root user verified
- [ ] **T008**: Local docker-compose starts all services in <5 minutes, health checks pass
- [ ] All files use non-root user (UID 1000) for security
- [ ] B18 health check endpoints integrated in Docker HEALTHCHECK
- [ ] Static files collected during build and accessible
- [ ] Documentation comments in docker-compose files explain each service
- [ ] `tasks.md` updated with WP01 status marked complete

---

## Review Guidance

**Key Checkpoints for Reviewers**:
1. **Dockerfile multi-stage build**: Verify builder stage has full toolchain, production stage is slim
2. **Non-root user**: Confirm USER django (UID 1000) in Dockerfile, not running as root
3. **Health checks**: Verify HEALTHCHECK in Dockerfile uses /health/live endpoint
4. **Docker Compose variants**: Confirm local has hot-reload (volume mount), staging has Nginx, prod has external services
5. **Environment variables**: Verify .env.example covers all required variables with clear descriptions
6. **Build time**: Test docker build completes in <10 minutes (reasonable network)
7. **Startup time**: Test docker-compose up starts all services in <5 minutes
8. **Security**: Confirm DEBUG=False in staging/prod, SECURE_SSL_REDIRECT=True in prod, no secrets in files

**Related Documents**:
- research.md Section 1 (Docker Multi-Stage Build Strategy)
- research.md Section 4 (Docker Compose Environment Variants)
- research.md Section 7 (Non-Root User Security Pattern)
- plan.md Constitution Check Section V (Security and Privacy)

---

## Activity Log

- 2025-12-03T00:00:00Z – copilot – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-03T10:30:00Z – copilot – shell_pid=39236 – lane=doing – Started implementation
- 2025-12-03T11:00:00Z – copilot – shell_pid=39236 – lane=doing – Completed T001-T006: All Docker and Compose files created at repository root
- 2025-12-03T11:00:00Z – copilot – shell_pid=39236 – lane=doing – NOTE: T007-T008 (verification) require Docker Desktop to be running - cannot complete without Docker engine
- 2025-12-03T11:15:00Z – copilot – shell_pid=39236 – lane=for_review – Implementation complete, ready for review (T001-T006 complete, T007-T008 pending Docker availability)
