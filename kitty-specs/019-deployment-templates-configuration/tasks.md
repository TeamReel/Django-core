# Implementation Tasks: Deployment Templates & Configuration (B19)
*Path: kitty-specs/019-deployment-templates-configuration/tasks.md*

**Branch**: `019-deployment-templates-configuration` | **Date**: 2025-12-03  
**Feature Spec**: [spec.md](spec.md) | **Implementation Plan**: [plan.md](plan.md)

---

## Overview

This document breaks down B19 Deployment Templates & Configuration into 4 work packages containing 32 subtasks. Each work package is independently implementable and includes a detailed prompt file in `tasks/planned/`.

**Scope Summary**:
- Docker multi-stage build templates
- Docker Compose templates (local, staging, production)
- Kubernetes manifests with multi-service separation
- Nginx reverse proxy configurations
- Environment variable templates and validation
- Comprehensive deployment documentation
- Integration with B03 (security), B15 (Celery), B18 (observability)

**Success Criteria**:
- Local development setup completes in <5 minutes
- Production deployment completes in <30 minutes
- Container build completes in <10 minutes
- Kubernetes deployment completes in <2 minutes
- All health checks pass (<60s startup)
- Zero-downtime deployments work
- 100% environment variable validation coverage

---

## Work Package Summary

| ID | Title | Subtasks | Priority | Prompt File |
|----|-------|----------|----------|-------------|
| WP01 | Docker Build & Compose Templates | 8 | P1 | [WP01-docker-build-compose.md](tasks/planned/WP01-docker-build-compose.md) |
| WP02 | Kubernetes Manifests & Configuration | 8 | P1 | [WP02-kubernetes-manifests.md](tasks/planned/WP02-kubernetes-manifests.md) |
| WP03 | Nginx & Environment Configuration | 8 | P2 | [WP03-nginx-environment-config.md](tasks/planned/WP03-nginx-environment-config.md) |
| WP04 | Documentation & Validation | 8 | P2 | [WP04-documentation-validation.md](tasks/planned/WP04-documentation-validation.md) |

**Total**: 4 work packages, 32 subtasks

---

## Phase 1: Foundational Infrastructure (WP01-WP02)

### WP01: Docker Build & Compose Templates
**Priority**: P1 (Critical Path)  
**Goal**: Create production-ready Dockerfile and Docker Compose templates for local, staging, and production environments  
**Prompt**: [tasks/planned/WP01-docker-build-compose.md](tasks/planned/WP01-docker-build-compose.md)

**Included Subtasks**:
- [ ] **T001**: Create multi-stage Dockerfile (python:3.12 → python:3.12-slim) [P]
- [ ] **T002**: Create .dockerignore file [P]
- [ ] **T003**: Create docker-compose.local.yml (dev environment with hot-reload) [P]
- [ ] **T004**: Create docker-compose.staging.yml (prod-like with local services) [P]
- [ ] **T005**: Create docker-compose.prod.yml (production with external services) [P]
- [ ] **T006**: Create .env.example template with all required variables [P]
- [ ] **T007**: Verify Dockerfile builds successfully (<10 minutes) [Depends: T001]
- [ ] **T008**: Verify local docker-compose stack starts (<5 minutes) [Depends: T003]

**Implementation Sketch**:
1. Copy Dockerfile from contracts/ to repository root, adjust paths if needed
2. Create .dockerignore excluding .git, venv, __pycache__, *.pyc
3. Copy docker-compose templates from contracts/ to repository root
4. Create .env.example with comprehensive variable documentation
5. Test docker build locally (should complete in <10 min)
6. Test docker-compose up -f docker-compose.local.yml (should start in <5 min)
7. Verify health checks pass at /health/live and /health/ready
8. Verify static files collected and accessible

**Parallel Opportunities**: T001-T006 can be done in parallel (different files)

**Dependencies**: None (foundational work package)

**Risks**:
- Dockerfile build might exceed 10-minute target on slow connections (downloading base images)
- Docker Compose services might fail if PostgreSQL/Redis ports already in use locally

**Success Criteria**:
- ✅ Dockerfile builds without errors in <10 minutes
- ✅ Local docker-compose stack starts all 5 services (web, db, redis, worker, beat)
- ✅ Health check endpoints return 200 OK
- ✅ Hot-reload works (code changes reflect without rebuild)
- ✅ .env.example contains all required variables with descriptions

---

### WP02: Kubernetes Manifests & Configuration
**Priority**: P1 (Critical Path)  
**Goal**: Create well-commented Kubernetes manifests with multi-service separation (web, worker, beat) and configuration management  
**Prompt**: [tasks/planned/WP02-kubernetes-manifests.md](tasks/planned/WP02-kubernetes-manifests.md)

**Included Subtasks**:
- [ ] **T009**: Create k8s/ directory and README.md [P]
- [ ] **T010**: Create configmap.yaml (non-sensitive configuration) [P]
- [ ] **T011**: Create secret.yaml template (credentials placeholders) [P]
- [ ] **T012**: Create deployment-web.yaml (Django + Gunicorn, 3+ replicas) [P]
- [ ] **T013**: Create deployment-celery-worker.yaml (task workers, 2+ replicas) [P]
- [ ] **T014**: Create deployment-celery-beat.yaml (scheduler, 1 replica only) [P]
- [ ] **T015**: Create service-web.yaml (LoadBalancer for external traffic) [P]
- [ ] **T016**: Create hpa-web.yaml (HorizontalPodAutoscaler for web tier) [P]

**Implementation Sketch**:
1. Create k8s/ directory at repository root
2. Copy K8s manifests from contracts/k8s/ to repository root k8s/
3. Update image references from "your-registry/django-core:latest" to appropriate placeholder
4. Add comprehensive inline comments explaining each manifest section
5. Create k8s/README.md with deployment instructions
6. Validate manifests with kubectl --dry-run=client
7. Ensure all probes use B18 health endpoints (/health/live, /health/ready)
8. Verify Prometheus scraping annotations present

**Parallel Opportunities**: T009-T016 can be done in parallel (different files)

**Dependencies**: None (can start alongside WP01)

**Risks**:
- Manifest YAML syntax errors might not be caught without kubectl validation
- Resource requests/limits might need tuning based on actual usage

**Success Criteria**:
- ✅ All 8 K8s manifests present in k8s/ directory
- ✅ kubectl apply --dry-run=client passes for all manifests
- ✅ Health probes configured with B18 endpoints
- ✅ Prometheus annotations present for metrics scraping
- ✅ Comments explain all non-obvious configuration
- ✅ README.md provides clear deployment instructions

---

## Phase 2: Configuration & Documentation (WP03-WP04)

### WP03: Nginx & Environment Configuration
**Priority**: P2 (Secondary)  
**Goal**: Create Nginx reverse proxy configurations for all environments and comprehensive environment variable templates  
**Prompt**: [tasks/planned/WP03-nginx-environment-config.md](tasks/planned/WP03-nginx-environment-config.md)

**Included Subtasks**:
- [ ] **T017**: Create nginx/ directory structure [P]
- [ ] **T018**: Create nginx/local.conf (optional local reverse proxy) [P]
- [ ] **T019**: Create nginx/staging.conf (HTTP only, security headers) [P]
- [ ] **T020**: Create nginx/production.conf (HTTPS with SSL, full headers) [P]
- [ ] **T021**: Update .env.example with B03 security variables [Depends: T006]
- [ ] **T022**: Update .env.example with B15 Celery variables [Depends: T006]
- [ ] **T023**: Update .env.example with B18 observability variables [Depends: T006]
- [ ] **T024**: Add cloud provider connection string examples to .env.example [Depends: T006]

**Implementation Sketch**:
1. Create nginx/ directory at repository root
2. Create nginx/local.conf (simple proxy_pass to web:8000)
3. Create nginx/staging.conf with security headers (HSTS, X-Content-Type-Options, X-Frame-Options)
4. Create nginx/production.conf with SSL termination and full security headers
5. Ensure all Nginx configs serve static files from /app/staticfiles/
6. Update .env.example with B03 security toggles (SECURE_SSL_REDIRECT, SESSION_COOKIE_SECURE, etc.)
7. Update .env.example with B15 Celery config (CELERY_WORKER_CONCURRENCY, task timeouts)
8. Update .env.example with B18 observability config (LOGGING_LEVEL, PROMETHEUS_METRICS_ENABLED, SENTRY_DSN)
9. Add AWS/GCP/Azure connection string examples in comments

**Parallel Opportunities**: T017-T020 (Nginx configs) parallel to T021-T024 (env vars)

**Dependencies**: T021-T024 depend on T006 (.env.example must exist first)

**Risks**:
- SSL certificate paths in production.conf might vary by deployment method
- Security headers might conflict with specific application requirements

**Success Criteria**:
- ✅ All 3 Nginx configurations present (local, staging, production)
- ✅ Security headers aligned with B03 baseline
- ✅ Static file serving configured correctly
- ✅ .env.example covers all B03/B15/B18 variables
- ✅ Cloud provider examples documented for AWS/GCP/Azure

---

### WP04: Documentation & Validation
**Priority**: P2 (Secondary)  
**Goal**: Create comprehensive deployment documentation covering all scenarios and add validation mechanisms  
**Prompt**: [tasks/planned/WP04-documentation-validation.md](tasks/planned/WP04-documentation-validation.md)

**Included Subtasks**:
- [ ] **T025**: Create docs/deployment/ directory structure [P]
- [ ] **T026**: Create docs/deployment/quickstart.md (local, staging, prod, K8s guides) [P]
- [ ] **T027**: Create docs/deployment/configuration-reference.md (env var catalog) [P]
- [ ] **T028**: Create docs/deployment/troubleshooting.md (common issues & fixes) [P]
- [ ] **T029**: Create docs/deployment/cloud-providers.md (AWS/GCP/Azure specifics) [P]
- [ ] **T030**: Create docs/deployment/alternatives.md (Traefik, Caddy, Kustomize notes) [P]
- [ ] **T031**: Create docs/adr/020-deployment-automation-strategy.md (ADR) [P]
- [ ] **T032**: Update main README.md with deployment quickstart link [Depends: T026]

**Implementation Sketch**:
1. Create docs/deployment/ directory
2. Copy quickstart.md from contracts/ to docs/deployment/, adjust paths
3. Create configuration-reference.md cataloging all environment variables with formats and validation rules
4. Create troubleshooting.md with common issues: port conflicts, DB connection errors, static file 404s, SSL cert errors
5. Create cloud-providers.md with specific guidance for AWS RDS/ElastiCache, GCP Cloud SQL/Memorystore, Azure Database/Redis Cache
6. Create alternatives.md documenting Traefik (automatic HTTPS), Caddy (simple config), Kustomize (environment overlays), Helm charts
7. Create ADR-020 documenting Docker/K8s choice rationale, alternatives considered, decision factors
8. Update main README.md with quick link to docs/deployment/quickstart.md

**Parallel Opportunities**: T025-T031 can all be done in parallel (different files)

**Dependencies**: T032 depends on T026 (quickstart must exist to link to it)

**Risks**:
- Documentation might become outdated as deployment patterns evolve
- Cloud provider instructions might be too specific to certain configurations

**Success Criteria**:
- ✅ All 6 documentation files present in docs/deployment/
- ✅ quickstart.md covers local (<5min), staging, prod (<30min), K8s (<2min) scenarios
- ✅ configuration-reference.md lists all environment variables with formats
- ✅ troubleshooting.md covers at least 10 common issues
- ✅ cloud-providers.md provides examples for AWS, GCP, Azure
- ✅ alternatives.md documents Traefik, Caddy, Kustomize, Helm
- ✅ ADR-020 justifies Docker/K8s choices
- ✅ Main README.md updated with deployment link

---

## Subtask Reference

### Complete Subtask List (T001-T032)

**WP01: Docker Build & Compose Templates**
1. T001: Create multi-stage Dockerfile
2. T002: Create .dockerignore file
3. T003: Create docker-compose.local.yml
4. T004: Create docker-compose.staging.yml
5. T005: Create docker-compose.prod.yml
6. T006: Create .env.example template
7. T007: Verify Dockerfile builds (<10 min)
8. T008: Verify local docker-compose starts (<5 min)

**WP02: Kubernetes Manifests & Configuration**
9. T009: Create k8s/ directory and README.md
10. T010: Create configmap.yaml
11. T011: Create secret.yaml template
12. T012: Create deployment-web.yaml
13. T013: Create deployment-celery-worker.yaml
14. T014: Create deployment-celery-beat.yaml
15. T015: Create service-web.yaml
16. T016: Create hpa-web.yaml

**WP03: Nginx & Environment Configuration**
17. T017: Create nginx/ directory
18. T018: Create nginx/local.conf
19. T019: Create nginx/staging.conf
20. T020: Create nginx/production.conf
21. T021: Add B03 security variables to .env.example
22. T022: Add B15 Celery variables to .env.example
23. T023: Add B18 observability variables to .env.example
24. T024: Add cloud provider examples to .env.example

**WP04: Documentation & Validation**
25. T025: Create docs/deployment/ directory
26. T026: Create docs/deployment/quickstart.md
27. T027: Create docs/deployment/configuration-reference.md
28. T028: Create docs/deployment/troubleshooting.md
29. T029: Create docs/deployment/cloud-providers.md
30. T030: Create docs/deployment/alternatives.md
31. T031: Create docs/adr/020-deployment-automation-strategy.md
32. T032: Update main README.md with deployment link

---

## Dependency Graph

```
WP01 (Docker & Compose)     WP02 (Kubernetes)
├─ T001-T006 [parallel]     ├─ T009-T016 [parallel]
├─ T007 [depends: T001]     └─ (no internal deps)
└─ T008 [depends: T003]     
        │                           │
        └───────────┬───────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
WP03 (Nginx & Env)      WP04 (Documentation)
├─ T017-T020 [parallel] ├─ T025-T031 [parallel]
├─ T021 [depends: T006] └─ T032 [depends: T026]
├─ T022 [depends: T006]
├─ T023 [depends: T006]
└─ T024 [depends: T006]
```

**Critical Path**: T001 → T007 → T008 (Docker build & local verification)  
**Parallel Opportunities**: 26 out of 32 subtasks can be parallelized by file/concern

---

## MVP Scope Recommendation

**Minimum Viable Deployment (MVP)**: WP01 only
- Dockerfile + docker-compose.local.yml enable immediate local development
- Provides <5 minute local setup (primary user need)
- Can defer K8s, Nginx configs, and full documentation for v2

**Recommended Initial Release**: WP01 + WP02
- Covers both Docker Compose and Kubernetes deployment paths
- Enables local dev (<5 min) and production K8s deployment (<2 min)
- WP03-WP04 add polish but aren't blocking for core functionality

---

## Implementation Order

**Recommended sequence**:
1. **Start with WP01** (foundational, enables local testing immediately)
2. **Parallel: WP02** (independent from WP01, different deployment target)
3. **Then WP03** (builds on .env.example from WP01)
4. **Finally WP04** (documentation references all artifacts from WP01-WP03)

**Estimated Effort**:
- WP01: 4-6 hours (Docker templates + local testing)
- WP02: 3-5 hours (K8s manifests + validation)
- WP03: 2-3 hours (Nginx configs + env var expansion)
- WP04: 4-6 hours (comprehensive documentation)
- **Total**: 13-20 hours

---

## Next Steps

1. Review this task breakdown for completeness
2. Select starting work package (recommend WP01)
3. Run `/spec-kitty.implement WP01` to begin implementation
4. Move work package prompt from `tasks/planned/` to `tasks/doing/` when started
5. Move to `tasks/for_review/` when implementation complete
6. Move to `tasks/done/` after code review approval

---

## Notes

- All subtasks marked `[P]` are parallelizable (work on different files/concerns)
- Health checks reference B18 endpoints: /health/live, /health/ready
- Metrics reference B18 endpoint: /metrics
- Security headers reference B03 baseline: HSTS, X-Content-Type-Options, X-Frame-Options, CSP
- Celery services reference B15 task scheduling: worker concurrency, timeouts, beat schedule
- All templates use non-root user (UID 1000) for security (B03 alignment)
- Docker images pinned to specific versions: python:3.12, postgres:13-alpine, redis:6-alpine, nginx:1.25-alpine

**Constitution Alignment**: ✅ All work packages comply with Django Core-App Constitution (verified in plan.md)
