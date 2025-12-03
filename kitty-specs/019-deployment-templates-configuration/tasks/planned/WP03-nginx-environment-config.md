---
work_package_id: "WP03"
subtasks:
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
title: "Nginx & Environment Configuration"
phase: "Phase 2 - Configuration & Documentation"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-03T00:00:00Z"
    lane: "planned"
    agent: "copilot"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP03 – Nginx & Environment Configuration

## Objectives & Success Criteria

**Goal**: Create Nginx reverse proxy configurations for all environments with B03 security headers, and expand .env.example with comprehensive B03/B15/B18 integration variables.

**Success Criteria**:
- ✅ All 3 Nginx configurations present (local, staging, production)
- ✅ Security headers aligned with B03 baseline (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
- ✅ Static file serving configured efficiently
- ✅ SSL termination in production.conf
- ✅ .env.example includes all B03, B15, B18 variables with descriptions
- ✅ Cloud provider connection string examples documented

---

## Context & Constraints

**Supporting Documents**: research.md Section 3 (Nginx Reverse Proxy), Section 6 (Environment Variable Strategy), Section 10 (B03/B15/B18 Integration)

**Key Decisions**:
- Nginx primary reverse proxy (Traefik/Caddy alternatives mentioned in docs)
- Security headers: HSTS (max-age=31536000), X-Content-Type-Options (nosniff), X-Frame-Options (DENY), X-XSS-Protection
- Static files: served by Nginx from /app/staticfiles/ volume
- SSL: production.conf handles TLS termination, staging.conf HTTP only

---

## Subtasks

### T017-T020: Nginx Configurations
Create nginx/ directory. Copy nginx configs from contracts/ (if available) or create:

**T018 - nginx/local.conf** (optional):
- Simple proxy_pass to web:8000
- No SSL, minimal config for local testing

**T019 - nginx/staging.conf**:
- HTTP only (port 80)
- proxy_pass to web:8000 with headers: X-Forwarded-For, X-Forwarded-Proto, Host
- Security headers: HSTS (note: HTTP so won't be enforced), X-Content-Type-Options, X-Frame-Options
- Static files: location /static/ → alias /app/staticfiles/, expires 1y

**T020 - nginx/production.conf**:
- HTTP redirect (port 80 → 443)
- HTTPS (port 443), ssl_certificate and ssl_certificate_key from /etc/nginx/ssl/
- Full security headers: HSTS (max-age=31536000, includeSubDomains), CSP, X-Content-Type-Options, X-Frame-Options
- proxy_pass to web:8000 with full header set
- Static files with cache headers (Cache-Control: public, immutable)

### T021-T024: Expand .env.example
Update .env.example (created in T006) with additional variables:

**T021 - B03 Security Variables**:
- SECURE_SSL_REDIRECT (True/False)
- SESSION_COOKIE_SECURE (True/False)
- CSRF_COOKIE_SECURE (True/False)
- SECURE_HSTS_SECONDS (31536000 for prod)
- SECURE_HSTS_INCLUDE_SUBDOMAINS (True/False)

**T022 - B15 Celery Variables**:
- CELERY_TASK_ALWAYS_EAGER (False in prod, True in dev for sync execution)
- CELERY_WORKER_CONCURRENCY (recommend: (2 * CPU_CORES) + 1)
- CELERY_TASK_SOFT_TIME_LIMIT (300 seconds)
- CELERY_TASK_TIME_LIMIT (600 seconds)
- CELERY_RESULT_BACKEND (optional, Redis or database)

**T023 - B18 Observability Variables**:
- LOGGING_LEVEL (DEBUG/INFO/WARNING/ERROR/CRITICAL)
- PROMETHEUS_METRICS_ENABLED (True/False)
- SENTRY_DSN (optional, for error tracking)

**T024 - Cloud Provider Examples**:
Add commented examples for:
- AWS: RDS connection string, ElastiCache Redis URL, S3 bucket config
- GCP: Cloud SQL connection (unix socket format), Memorystore Redis, Cloud Storage
- Azure: PostgreSQL connection with sslmode=require, Redis Cache with ssl_cert_reqs

---

## Definition of Done

- [ ] nginx/ directory with 3 config files
- [ ] All security headers present in staging/prod configs
- [ ] Static file serving configured
- [ ] SSL termination in production.conf
- [ ] .env.example updated with B03/B15/B18 variables
- [ ] Cloud provider examples in .env.example comments
- [ ] Nginx configs tested with docker-compose (staging/prod)

---

## Activity Log

- 2025-12-03T00:00:00Z – copilot – lane=planned – Prompt created
