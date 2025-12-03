# Research: Deployment Templates & Configuration (B19)
*Path: kitty-specs/019-deployment-templates-configuration/research.md*

**Date**: 2025-12-03 | **Branch**: `019-deployment-templates-configuration`

## Research Overview

This document captures technical decisions, best practices, and patterns for implementing B19 Deployment Templates & Configuration. The research focuses on Docker multi-stage builds, Gunicorn/Nginx configuration, Kubernetes deployment patterns, and integration with existing B03/B15/B18 features.

---

## 1. Docker Multi-Stage Build Strategy

### Decision: python:3.12 (dev) + python:3.12-slim (production)

**Rationale:**
- **Development Stage**: `python:3.12` includes build tools (gcc, make) needed for compiling Python packages with C extensions (psycopg2, cryptography)
- **Production Stage**: `python:3.12-slim` reduces image size by ~600MB, removes unnecessary build tools, minimizes attack surface
- **Security**: Smaller attack surface in production, fewer CVEs to track
- **Build Time**: Multi-stage eliminates need to install/uninstall build dependencies in single stage

**Alternatives Considered:**
- `python:3.12-alpine`: Rejected due to musl libc compatibility issues with many Python packages (psycopg2-binary doesn't work, requires compilation)
- `python:3.12-slim` only: Rejected because compilation dependencies would bloat production image
- `distroless`: Rejected as too restrictive for debugging and package installation during development

**Implementation Details:**
```dockerfile
# Stage 1: Build stage with full toolchain
FROM python:3.12 as builder
RUN pip install --user --no-cache-dir -r requirements/production.txt

# Stage 2: Production runtime with minimal base
FROM python:3.12-slim
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
```

**References:**
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/
- Python Docker Official Images: https://hub.docker.com/_/python

---

## 2. WSGI Server Configuration

### Decision: Gunicorn with sync workers (default), gevent option documented

**Rationale:**
- **Maturity**: Gunicorn is battle-tested, stable, and has extensive Django community adoption
- **Simplicity**: Straightforward configuration, minimal moving parts
- **Performance**: Adequate for most workloads with sync workers; gevent available for I/O-bound scenarios
- **Observability**: Integrates cleanly with Prometheus exporters, structured logging

**Alternatives Considered:**
- **uWSGI**: Rejected due to complex configuration, steeper learning curve, less intuitive defaults
- **Daphne** (ASGI): Rejected as B19 doesn't require WebSockets/async capabilities yet
- **mod_wsgi**: Rejected as containerized deployment doesn't use Apache

**Configuration Strategy:**
```bash
# Production command (docker-compose.prod.yml)
gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --worker-class sync \
  --max-requests 1000 \
  --max-requests-jitter 50 \
  --timeout 30 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
```

**Worker Calculation**: `(2 * CPU_CORES) + 1` - documented in quickstart with resource limit examples

**References:**
- Gunicorn Deployment: https://docs.gunicorn.org/en/stable/deploy.html
- Django Deployment Checklist: https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

---

## 3. Nginx Reverse Proxy Configuration

### Decision: Nginx as primary reverse proxy with security headers and static file serving

**Rationale:**
- **Performance**: Efficient static file serving, connection pooling, load balancing
- **Security**: Easy to configure security headers (HSTS, CSP, X-Frame-Options) aligned with B03
- **Caching**: Upstream response caching reduces Django load for cacheable content
- **SSL Termination**: Handles TLS/SSL termination in production
- **Battle-Tested**: Industry standard for Django deployments

**Alternatives Considered:**
- **Traefik**: Valid for dynamic routing and automatic HTTPS via Let's Encrypt; mentioned in docs as alternative
- **Caddy**: Valid for automatic HTTPS with simpler config; mentioned in docs as alternative
- **No Reverse Proxy**: Rejected as Gunicorn alone lacks static file efficiency and security header injection

**Configuration Highlights:**
```nginx
# Security headers (B03 integration)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;

# Proxy to Gunicorn upstream
location / {
    proxy_pass http://web:8000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Host $host;
    proxy_redirect off;
}

# Static files
location /static/ {
    alias /app/staticfiles/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**References:**
- Nginx Django Guide: https://docs.nginx.com/nginx/admin-guide/web-server/app-gateway-uwsgi-django/
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/

---

## 4. Docker Compose Environment Variants

### Decision: Three separate compose files (local, staging, prod) with clear differentiation

**Rationale:**
- **Clarity**: Each environment's configuration is explicit and self-contained
- **Safety**: Prevents accidental production deploys with debug settings
- **Customization**: Teams can modify environments independently without inheritance complexity

**Environment Characteristics:**

| Aspect | Local | Staging | Production |
|--------|-------|---------|------------|
| **Purpose** | Development hot-reload | Pre-prod testing | Live deployment |
| **DEBUG** | True | False | False |
| **Services** | Local PostgreSQL, Redis | Local PostgreSQL, Redis | External managed services |
| **Volumes** | Source code mounted | Static only | Static only |
| **Nginx** | Optional | Included | Included |
| **Resource Limits** | None | Minimal | Production-grade |
| **Observability** | Basic | Full (B18) | Full (B18) |

**Alternatives Considered:**
- **Single compose + overrides**: Rejected as inheritance chain becomes complex to debug
- **docker-compose.override.yml**: Rejected as it encourages implicit local-only configs

**File Naming Convention:**
- `docker-compose.local.yml` - Development environment
- `docker-compose.staging.yml` - Staging environment
- `docker-compose.prod.yml` - Production environment

---

## 5. Kubernetes Manifest Structure (Multi-Service Separation)

### Decision: Separate Deployments per service, clear resource boundaries

**Rationale:**
- **Scaling Independence**: Web, worker, beat scale independently based on load
- **Resource Optimization**: Different resource profiles for different workloads
- **Deployment Isolation**: Rolling updates to web don't affect background workers
- **Operational Clarity**: Each service has its own health checks, logs, metrics

**Manifest Breakdown** (~8-10 files):

1. **Deployments** (3 files):
   - `deployment-web.yaml` - Django + Gunicorn web server
   - `deployment-celery-worker.yaml` - Celery task workers
   - `deployment-celery-beat.yaml` - Celery scheduler (single replica)

2. **Services** (2 files):
   - `service-web.yaml` - LoadBalancer/NodePort for external traffic
   - `service-internal.yaml` - ClusterIP for inter-service communication (if needed)

3. **Configuration** (2 files):
   - `configmap.yaml` - Non-sensitive app configuration (LOGGING_LEVEL, CELERY_TASK_ALWAYS_EAGER=False)
   - `secret.yaml` - Template for credentials (DATABASE_URL, REDIS_URL, SECRET_KEY, etc.)

4. **Optional** (1 file):
   - `hpa-web.yaml` - HorizontalPodAutoscaler example for web tier

**Resource Requests/Limits** (example values):
```yaml
# Web container
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Worker container (more memory for task processing)
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

**Health Probes** (B18 integration):
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Alternatives Considered:**
- **Single monolithic Deployment**: Rejected as it prevents independent scaling and updates
- **Kustomize structure**: Rejected as "minimal K8s" scope doesn't justify overlays complexity
- **Helm charts**: Out of scope for B19; mentioned as future enhancement in docs

**References:**
- Kubernetes Best Practices: https://kubernetes.io/docs/concepts/configuration/overview/
- Django on Kubernetes: https://testdriven.io/blog/django-kubernetes/

---

## 6. Environment Variable Strategy

### Decision: Categorized .env.example with validation documentation

**Rationale:**
- **Developer Experience**: Clear categories make it easy to find relevant settings
- **Security**: Separates sensitive (SECRET_KEY) from non-sensitive (DEBUG) variables
- **Validation**: Documents expected formats and validation rules
- **Cloud Migration**: Database URLs support connection string format for managed services

**Variable Categories:**

1. **Django Core** (FR-012):
   - `SECRET_KEY` - Django secret key (required, 50+ chars)
   - `DEBUG` - Debug mode (boolean, default: False)
   - `ALLOWED_HOSTS` - Comma-separated hostnames
   - `CSRF_TRUSTED_ORIGINS` - Comma-separated HTTPS origins

2. **Database** (FR-013):
   - `DATABASE_URL` - PostgreSQL connection string (postgresql://user:pass@host:port/db)
   - Supports AWS RDS, GCP Cloud SQL, Azure Database format

3. **Caching & Broker** (FR-014):
   - `REDIS_URL` - Redis connection string (redis://host:port/db)
   - `CELERY_BROKER_URL` - Celery broker (typically same as REDIS_URL)
   - `CELERY_RESULT_BACKEND` - Result backend (optional, Redis or database)

4. **Security** (B03 integration, FR-015):
   - `SECURE_SSL_REDIRECT` - Force HTTPS (boolean)
   - `SESSION_COOKIE_SECURE` - Secure session cookies (boolean)
   - `CSRF_COOKIE_SECURE` - Secure CSRF cookies (boolean)

5. **Observability** (B18 integration, FR-016):
   - `LOGGING_LEVEL` - Log level (DEBUG/INFO/WARNING/ERROR)
   - `SENTRY_DSN` - Optional Sentry error tracking
   - `PROMETHEUS_METRICS_ENABLED` - Enable /metrics endpoint (boolean)

6. **Celery Configuration** (B15 integration, FR-017):
   - `CELERY_TASK_ALWAYS_EAGER` - Run tasks synchronously (boolean, dev only)
   - `CELERY_WORKER_CONCURRENCY` - Worker pool size
   - `CELERY_TASK_SOFT_TIME_LIMIT` - Task timeout (seconds)

7. **Cloud Providers** (FR-018):
   - Examples for AWS (RDS, ElastiCache, S3), GCP (Cloud SQL, Memorystore), Azure (PostgreSQL, Redis Cache)

**Validation Strategy:**
- Startup validation script checks for required variables
- Format validation for URLs, booleans, numeric values
- Clear error messages with examples when validation fails

**References:**
- 12-Factor App Config: https://12factor.net/config
- Django Environment Variables: https://django-environ.readthedocs.io/

---

## 7. Non-Root User Security Pattern

### Decision: Run all containers as non-root user (UID 1000)

**Rationale:**
- **Security**: Limits impact of container escape vulnerabilities
- **B03 Alignment**: Secure defaults principle
- **Kubernetes Compatibility**: Many clusters enforce non-root policies (PodSecurityPolicy/PodSecurity admission)

**Implementation Pattern:**
```dockerfile
FROM python:3.12-slim

# Create non-root user
RUN groupadd -r django && useradd -r -g django django

# Set up application directory with correct ownership
WORKDIR /app
COPY --chown=django:django . /app

# Switch to non-root user
USER django

# Run application
CMD ["gunicorn", "config.wsgi:application"]
```

**References:**
- Docker Security Best Practices: https://docs.docker.com/develop/security-best-practices/
- OWASP Container Security: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html

---

## 8. Static File Management

### Decision: collectstatic during image build, serve via Nginx volume

**Rationale:**
- **Performance**: Nginx serves static files more efficiently than Django
- **Simplicity**: Static files bundled in image, no external CDN dependency required
- **Flexibility**: Teams can add CDN later without template changes

**Implementation Strategy:**
```dockerfile
# In Dockerfile (production stage)
RUN python manage.py collectstatic --noinput --clear

# In docker-compose.prod.yml
services:
  web:
    volumes:
      - static_volume:/app/staticfiles

  nginx:
    volumes:
      - static_volume:/app/staticfiles:ro  # Read-only
```

**Alternatives Considered:**
- **CDN-only**: Out of scope for B19; mentioned as enhancement in docs
- **Django serving**: Rejected as inefficient for production

---

## 9. Database Migrations Strategy

### Decision: Run migrations as init container (K8s) or depends_on (Docker Compose)

**Rationale:**
- **Safety**: Migrations run before application containers start
- **Idempotency**: Django migrations are idempotent, safe to run multiple times
- **Visibility**: Migration failures prevent application deployment

**Docker Compose Pattern:**
```yaml
services:
  migrate:
    image: django-app:latest
    command: python manage.py migrate --noinput
    depends_on:
      - db
      - redis

  web:
    depends_on:
      migrate:
        condition: service_completed_successfully
```

**Kubernetes Pattern:**
```yaml
spec:
  initContainers:
    - name: migrate
      image: django-app:latest
      command: ["python", "manage.py", "migrate", "--noinput"]
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: django-secrets
              key: database-url
```

**References:**
- Django Migrations: https://docs.djangoproject.com/en/5.1/topics/migrations/
- Kubernetes Init Containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/

---

## 10. Integration with Existing Features

### B03 Security Baseline Integration

**Requirements** (FR-025 to FR-029):
- HTTPS enforcement via `SECURE_SSL_REDIRECT`
- Secure cookies via `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`
- HSTS headers via Nginx configuration
- Security headers via Nginx (X-Content-Type-Options, X-Frame-Options, CSP)

**Implementation Points:**
- Environment variables: `.env.example` includes all security toggles
- Nginx config: Security headers template in `nginx.conf`
- Docker Compose: Staging/prod environments have secure defaults
- Documentation: Security checklist in deployment quickstart

### B15 Task Scheduling Integration

**Requirements** (FR-030 to FR-034):
- Celery worker service in all Docker Compose templates
- Celery beat service (single instance, staging/prod only)
- Redis broker configuration
- Queue configuration via environment variables

**Implementation Points:**
- Docker Compose: Separate `worker` and `beat` services
- Kubernetes: Separate Deployments for worker (multi-replica) and beat (single replica)
- Environment variables: `CELERY_BROKER_URL`, worker concurrency settings
- Health checks: Worker liveness checks via Celery control commands

### B18 Observability Integration

**Requirements** (FR-035 to FR-040):
- Health check endpoints: `/health/live`, `/health/ready`
- Prometheus metrics: `/metrics` endpoint
- Structured logging: JSON formatter for production

**Implementation Points:**
- Kubernetes probes: Use `/health/live` and `/health/ready` endpoints
- Prometheus scraping: Annotate Kubernetes pods for metrics collection
- Logging: Configure JSON logging in production environment settings
- Docker Compose: Include Prometheus service in staging template (optional)

---

## 11. Documentation Structure

**Planned Documentation Files:**

1. **quickstart.md** (FR-041, FR-042):
   - Local development setup (<5 min)
   - Staging deployment guide
   - Production deployment guide (<30 min)
   - Environment variable configuration

2. **configuration-reference.md** (FR-043):
   - Complete environment variable catalog
   - Expected formats and validation rules
   - Security-sensitive variables highlighted
   - Cloud provider examples (AWS/GCP/Azure)

3. **deployment-troubleshooting.md** (FR-044):
   - Common deployment issues and solutions
   - Health check debugging
   - Database connection problems
   - Static file 404s
   - Container build failures

4. **cloud-providers.md** (FR-045, FR-046, FR-047):
   - AWS deployment notes (RDS, ElastiCache, ECS/EKS)
   - GCP deployment notes (Cloud SQL, Memorystore, GKE)
   - Azure deployment notes (PostgreSQL, Redis Cache, AKS)
   - Connection string formats for managed services

5. **alternatives.md** (FR-048):
   - Traefik as Nginx alternative (automatic HTTPS)
   - Caddy as Nginx alternative (simpler config)
   - Brief comparison and migration notes

---

## 12. Success Criteria Verification

| Criterion | Implementation Approach | Verification Method |
|-----------|------------------------|---------------------|
| **SC-001**: Local <5min | Docker Compose with prebuilt images, clear quickstart | Timed test with fresh checkout |
| **SC-002**: Prod <30min | Step-by-step guide, minimal prerequisites | Timed test on clean VPS |
| **SC-003**: Build <10min | Multi-stage optimizations, layer caching | CI build time metrics |
| **SC-004**: Health <60s | B18 health checks, reasonable probe delays | Kubernetes deployment events |
| **SC-005**: Zero-downtime | Rolling updates, readiness probes | Blue/green test deployment |
| **SC-006**: K8s <2min | Manifests ready to apply, no complex setup | kubectl apply + watch timing |
| **SC-007**: 100% env validation | Startup validation script | Missing variable error messages |
| **SC-008**: No external docs | Self-documenting templates, inline comments | Template review |
| **SC-009**: B18 integration | Health/metrics endpoints in manifests | Prometheus scrape verification |
| **SC-010**: Cloud via env vars | Connection string support | AWS RDS connection test |

---

## Research Summary

**Key Decisions:**
1. ✅ Container images: `python:3.12` (dev), `python:3.12-slim` (prod)
2. ✅ WSGI server: Gunicorn with sync workers, gevent option documented
3. ✅ Reverse proxy: Nginx primary, Traefik/Caddy alternatives mentioned
4. ✅ Compose variants: 3 separate files (local, staging, prod)
5. ✅ Kubernetes: Multi-service separation (~8-10 manifests)
6. ✅ Environment variables: Categorized by function, validation documented
7. ✅ Security: Non-root user, B03 headers, secure defaults
8. ✅ Static files: collectstatic in image, Nginx volume serving
9. ✅ Migrations: Init containers (K8s), depends_on (Compose)
10. ✅ Integration: B03/B15/B18 alignment documented

**Next Steps:**
- Phase 1: Design deployment contracts (Dockerfile, docker-compose templates, K8s manifests)
- Phase 1: Create quickstart.md with setup instructions
- Phase 2: Break down into work packages and tasks

**Research Status**: ✅ COMPLETE
