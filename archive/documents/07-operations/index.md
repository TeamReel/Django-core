# Operations Guide

## Overview

This section covers the operational aspects of running the Django Core-App in production.

## Key Topics

*   **[Deployment](deployment.md)**: Complete deployment guide for Railway, Docker, Kubernetes, and other platforms.
*   **[Railway Integration](railway-integration.md)**: Specific guide for Railway deployment (recommended).
    *   See also: [TeamReel-specific Railway guide](../05-demo/infrastructure/railway-services.md) for worker setup & queue routing.
*   **[Observability](observability.md)**: Monitoring, logging, metrics, health checks, and error tracking.
*   **[Database Management](database.md)**: Backups, migrations, maintenance, and optimization.
- **[Production Validation](./production-validation.md)**
- **[Railway Deployment B37](./railway-deployment-B37.md)**: Workflow Engine deployment specifics.
- **[VP9 Alpha Railway](./rvm-vp9-alpha-railway.md)**: VP9 video encoding on Railway.
- **[Seed Plan](./seed-plan.md)**: Database seeding strategy and plan.

## Deployment Options

### 1. Railway (Recommended for MVP/Demo)
- Managed PostgreSQL and Redis
- Automatic deploys from GitHub
- Built-in monitoring and logs
- **Guide**: [Railway Integration](railway-integration.md)

### 2. Docker (Self-Hosted)
- Full control over infrastructure
- Multiple environments (local, staging, production)
- **Guide**: [Deployment - Docker Section](deployment.md#2-docker-self-hosted)

### 3. Kubernetes (Enterprise)
- High availability
- Auto-scaling
- Advanced orchestration
- **Guide**: [Deployment - Kubernetes Section](deployment.md#3-kubernetes-enterprise)

## Operations Quick Reference

### Health Checks
```bash
# Check application health
curl https://yourdomain.com/health/live
curl https://yourdomain.com/health/ready
curl https://yourdomain.com/health/db
```

### Database Operations
```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Seed data
python manage.py seed_demo_data
python manage.py seed_default_roles
```

### Monitoring
```bash
# Check metrics
python manage.py check_metrics

# Check workers
python manage.py check_workers

# View logs
railway logs  # Railway
docker-compose logs -f web  # Docker
```

### Maintenance
```bash
# Rebuild search index
python manage.py rebuild_search_index

# Warm caches
python manage.py warm_permission_cache

# Clean up soft-deleted records
python manage.py cleanup_deleted_organisations
```
