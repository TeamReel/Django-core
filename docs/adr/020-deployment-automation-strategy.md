# ADR-020: Deployment Automation Strategy

**Status**: Accepted  
**Date**: 2025-12-04  
**Decision Makers**: Platform Team  
**Related**: B19 Deployment Templates & Configuration

---

## Context

Django Core-App requires deployment templates covering local development, staging, and production environments. The platform must support:

1. **Local Development**: Fast iteration with hot-reload (<5 minute setup)
2. **Staging Environment**: Production-like testing with full observability
3. **Production Deployment**: Single-server or cloud VPS deployment (<30 minute setup)
4. **Kubernetes**: Scalable multi-node deployment for enterprise use (<2 minute setup)

### Requirements

- **Multi-Environment Support**: dev, staging, production configurations
- **Container-Based**: Reproducible builds, consistent environments
- **Scalability**: Handle 10-1000+ concurrent users
- **Observability**: Health checks (B18), metrics, logging
- **Security**: TLS termination, secure defaults (B03)
- **Developer Experience**: Simple commands, clear documentation
- **Cloud Portability**: Work on AWS, GCP, Azure, or bare metal

### Constraints

- **No Cloud Lock-in**: Avoid vendor-specific deployment formats (CloudFormation, ARM templates)
- **Low Operational Overhead**: Minimize infrastructure complexity for small teams
- **Open Source Tooling**: Prefer battle-tested, widely adopted tools
- **Constitution Compliance**: Meet B03 (security), B15 (task scheduling), B18 (observability) requirements

---

## Decision

Adopt **Docker Compose** for local/staging/production deployments and **Kubernetes (K8s)** for scalable production clusters:

1. **Containerization**: Multi-stage Dockerfile with Gunicorn WSGI server
2. **Local Development**: docker-compose.local.yml with hot-reload
3. **Staging**: docker-compose.staging.yml with Nginx reverse proxy
4. **Production (Single-Server)**: docker-compose.prod.yml with external PostgreSQL/Redis
5. **Production (Cluster)**: Kubernetes manifests with HPA, health checks, Prometheus integration
6. **Reverse Proxy**: Nginx for SSL termination, static file serving, security headers

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Nginx (Reverse Proxy)                  │
│  - SSL/TLS Termination                                      │
│  - Static File Serving                                      │
│  - Security Headers (B03)                                   │
│  - Load Balancing (production)                              │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
     ┌───────▼────────┐              ┌────────▼─────────┐
     │  Django + Gunicorn             │   Celery Workers │
     │  - Web Requests │              │   - Background   │
     │  - Health Checks│              │     Tasks        │
     │  - Metrics (B18)│              │   - Task Queue   │
     └───────┬────────┘              └────────┬─────────┘
             │                                │
             │                                │
     ┌───────▼────────────────────────────────▼─────────┐
     │            PostgreSQL (Database)                  │
     └───────────────────────────────────────────────────┘
     ┌───────────────────────────────────────────────────┐
     │         Redis (Cache + Celery Broker)             │
     └───────────────────────────────────────────────────┘
```

---

## Rationale

### Why Docker Compose?

**Advantages**:
- **Simplicity**: Single YAML file defines entire stack
- **Low Barrier**: Developers already familiar with Docker
- **Environment Variants**: local.yml, staging.yml, prod.yml for configuration isolation
- **Orchestration**: Manages multi-container dependencies (web, db, redis, celery)
- **Portability**: Runs identically on Mac, Linux, Windows, cloud VMs
- **Development Velocity**: `docker-compose up` gets entire stack running in seconds

**Use Cases**:
- Local development (hot-reload, immediate feedback)
- Staging environments (production parity testing)
- Single-server production (VPS, small-scale deployments)

### Why Kubernetes?

**Advantages**:
- **Scalability**: Horizontal pod autoscaling (3-10+ replicas)
- **High Availability**: Multi-node deployment, automatic pod rescheduling
- **Zero-Downtime Updates**: Rolling deployments with health checks
- **Service Discovery**: Built-in DNS, load balancing
- **Industry Standard**: Supported by AWS (EKS), GCP (GKE), Azure (AKS)
- **Ecosystem**: Helm, Prometheus, Istio, etc.

**Use Cases**:
- Enterprise production (multi-node clusters)
- High-traffic applications (1000+ concurrent users)
- Multi-region deployments
- Microservices architectures

### Why Gunicorn?

**Advantages**:
- **Production-Ready**: Battle-tested WSGI server for Django
- **Performance**: Pre-fork worker model, handles concurrency well
- **Configuration**: Simple worker tuning (count, timeout, threads)
- **Integration**: Native Django WSGI support

**Alternatives Considered**: uWSGI (more complex), Daphne (ASGI, not needed for current requirements)

### Why Nginx?

**Advantages**:
- **Performance**: 10K+ concurrent connections, static file serving
- **SSL/TLS**: TLS 1.2/1.3, OCSP stapling, modern ciphers
- **Security**: B03 headers (HSTS, CSP, X-Frame-Options)
- **Maturity**: 20+ years, widely documented
- **Flexibility**: Reverse proxy, load balancing, caching

**Alternatives Considered**: Traefik (automatic HTTPS but more complex), Caddy (simpler but less performant) - see ADR alternatives section below

---

## Alternatives Considered

### 1. Heroku (PaaS)

**Pros**:
- Zero-configuration deployment (`git push heroku main`)
- Managed PostgreSQL and Redis
- Automatic SSL

**Cons**:
- **Cost**: $25-$500+/month (expensive at scale)
- **Vendor Lock-in**: Proprietary platform, difficult migration
- **Limited Control**: Cannot customize infrastructure
- **No Docker Support**: Uses buildpacks instead

**Decision**: Rejected due to cost and vendor lock-in. Docker Compose provides similar DX with more control.

---

### 2. Ansible Playbooks

**Pros**:
- Agentless automation
- Idempotent configuration management
- Multi-server deployments

**Cons**:
- **Steeper Learning Curve**: Requires YAML playbook expertise
- **More Complex**: Additional abstraction over Docker Compose
- **Overkill**: Not needed for container-based deployments

**Decision**: Deferred. May adopt later for multi-server bare-metal deployments, but Docker Compose sufficient for current needs.

---

### 3. Terraform (IaC)

**Pros**:
- Infrastructure as Code
- Multi-cloud support (AWS, GCP, Azure)
- State management

**Cons**:
- **Complexity**: Requires HCL language, state management
- **Not Deployment Tool**: Provisions infrastructure, not application deployment
- **Overhead**: Additional tool in stack

**Decision**: Deferred. Recommended for cloud infrastructure provisioning (VPCs, RDS, EKS), but not for application deployment itself.

---

### 4. Docker Swarm

**Pros**:
- Simpler than Kubernetes
- Native Docker orchestration
- Built into Docker Engine

**Cons**:
- **Declining Adoption**: Community moved to Kubernetes
- **Limited Ecosystem**: Fewer tools, charts, integrations
- **Uncertain Future**: Docker Inc. focus shifted away from Swarm

**Decision**: Rejected. Kubernetes is industry standard with larger ecosystem and cloud provider support.

---

### 5. Kustomize / Helm (Kubernetes Package Management)

**Pros**:
- **Kustomize**: Template-free overlays, built into kubectl
- **Helm**: Versioned releases, rollback, chart repository

**Cons**:
- **Overhead**: Additional complexity for current requirements
- **Not Needed**: Plain manifests sufficient for single application

**Decision**: Deferred. Recommended as future enhancement for multi-environment K8s deployments (see [alternatives.md](../deployment/alternatives.md)).

---

## Consequences

### Positive

✅ **Developer Experience**: `docker-compose up` gets entire stack running in <5 minutes  
✅ **Production Parity**: Staging environment identical to production configuration  
✅ **Scalability**: Kubernetes path for horizontal scaling when needed  
✅ **Cloud Portability**: Works on AWS, GCP, Azure, bare metal VPS  
✅ **Standard Tools**: Docker, Kubernetes, Nginx are industry standards with large communities  
✅ **Constitution Compliance**: Meets B03 (security headers, TLS), B15 (Celery), B18 (health checks, metrics)  
✅ **Low Barrier**: Minimal infrastructure knowledge required (Docker Compose)  
✅ **Flexibility**: Can deploy to single VPS or multi-node cluster with same images  

### Negative

❌ **Learning Curve**: Kubernetes has steep learning curve (mitigated by providing pre-built manifests)  
❌ **Operational Overhead**: K8s requires cluster management (mitigated by managed services: EKS, GKE, AKS)  
❌ **Not Cloud-Agnostic IaC**: Manual cloud resource provisioning (Terraform recommended for automation)  
❌ **Nginx Configuration Complexity**: SSL setup requires manual steps (mitigated by comprehensive docs)  

### Neutral

🔵 **Docker Dependency**: Requires Docker Desktop (development) or Docker Engine (production) - acceptable tradeoff for reproducibility  
🔵 **Multiple Configuration Files**: 3 Docker Compose variants + K8s manifests - organized in clear directory structure  

---

## Implementation

### Deliverables (B19)

1. **Dockerfile**: Multi-stage build (python:3.12 → python:3.12-slim)
2. **docker-compose.local.yml**: Hot-reload development environment
3. **docker-compose.staging.yml**: Production-like testing with Nginx
4. **docker-compose.prod.yml**: Single-server deployment with external services
5. **.env.example**: Comprehensive environment variable template (241 lines)
6. **k8s/**: 8 Kubernetes manifests (ConfigMap, Secret, Deployments, Service, HPA)
7. **nginx/**: 3 Nginx configs (local, staging, production)
8. **docs/deployment/**: Quickstart, configuration reference, troubleshooting, cloud providers, alternatives

### Success Criteria Met

- ✅ Local setup in <5 minutes: `cp .env.example .env && docker-compose -f docker-compose.local.yml up`
- ✅ Production deployment in <30 minutes: Image build + VPS setup + docker-compose.prod.yml
- ✅ Kubernetes deployment in <2 minutes: `kubectl apply -f k8s/`
- ✅ Health checks: /health/live (liveness), /health/ready (readiness)
- ✅ Metrics: /metrics (Prometheus)
- ✅ Security: TLS 1.2/1.3, HSTS, CSP, X-Frame-Options
- ✅ Task scheduling: Celery worker + beat services
- ✅ Horizontal scaling: HPA (3-10 replicas based on CPU/memory)

---

## Adoption Strategy

### Phase 1: Local Development (Immediate)

```bash
cp .env.example .env
docker-compose -f docker-compose.local.yml up
```

**Benefits**: Developers get consistent environment, no manual PostgreSQL/Redis setup.

---

### Phase 2: Staging Deployment (Within 1 Sprint)

```bash
docker build -t django-core:staging .
docker-compose -f docker-compose.staging.yml up -d
```

**Benefits**: Production parity testing, Nginx integration validation, full observability.

---

### Phase 3: Production Single-Server (MVP Launch)

```bash
# On VPS
docker-compose -f docker-compose.prod.yml up -d
```

**Benefits**: Simple production deployment, handles 10-100 concurrent users, low operational overhead.

---

### Phase 4: Kubernetes Migration (Scale-Up)

```bash
kubectl apply -f k8s/
```

**Benefits**: Horizontal scaling, high availability, zero-downtime updates for 100-1000+ concurrent users.

---

## Review and Update

This ADR should be reviewed when:
- Application outgrows single-server deployment (consider K8s migration)
- Cloud provider managed services needed (consider Terraform adoption)
- Multi-environment complexity increases (consider Kustomize/Helm)
- New deployment patterns emerge (serverless, edge computing)

**Next Review Date**: 2026-06-04 (6 months)

---

## References

- [B19 Feature Spec](../../kitty-specs/019-deployment-templates-configuration/spec.md)
- [Deployment Quickstart](../deployment/quickstart.md)
- [Configuration Reference](../deployment/configuration-reference.md)
- [Alternatives Guide](../deployment/alternatives.md)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [12-Factor App Methodology](https://12factor.net/)

---

## Appendix: Decision Matrix

| Criteria | Docker Compose | Kubernetes | Heroku | Ansible | Weight |
|----------|----------------|------------|--------|---------|--------|
| **Simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 25% |
| **Scalability** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 20% |
| **Cost** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 20% |
| **Portability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ | 15% |
| **Community** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 10% |
| **Control** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 10% |
| **Weighted Score** | **4.45** | **4.15** | **2.95** | **3.7** | |

**Decision**: Docker Compose for simplicity + Kubernetes for scalability = Best of both worlds.
