# Deployment Guide

## Overview

Django Core-App supports multiple deployment targets. This guide covers the most common deployment scenarios.

## Deployment Targets

### 1. Railway (Recommended for MVP/Demo)

Railway provides the simplest production deployment with automatic builds and managed PostgreSQL/Redis.

**Architecture (6 services + 2 datastores):**
- **Web Service** (`backend`): Django app (Gunicorn) — `api.teamreel.app`
- **Beat Service** (`celery-beat`): Celery Beat scheduler (cleanup, metrics)
- **Worker Fast** (`celery-worker`): Celery — `default` + `video_fast` queues (c=2)
- **Worker Video** (`video-worker`): Celery — `video_slow` queue (c=1, heavy processing)
- **Worker AI** (`worker-ai`): Celery — `ai_generation` queue (c=1, rate-limited)
- **Frontend** (`frontend`): React/Vite — `demo.teamreel.app`
- **PostgreSQL**: Managed database
- **Redis**: Managed cache + Celery broker

**Setup Guide:** See [Railway Integration](railway-integration.md) for complete setup instructions.

**Quick Deploy:**
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up
```

### 2. Docker (Self-Hosted)

Deploy using Docker Compose on any server with Docker support.

**Production Configuration:**
```bash
# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate

# Collect static files
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
```

**Staging Configuration:**
```bash
docker-compose -f docker-compose.staging.yml up -d
```

### 3. Kubernetes (Enterprise)

For high-availability production deployments.

**Manifests Location:** `k8s/`

**Deploy:**
```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n django-core

# View logs
kubectl logs -f deployment/django-core-web -n django-core
```

### 4. Render / Heroku / Fly.io

Similar to Railway, these platforms support Procfile-based deployments.

**Requirements:**
- `Procfile` (included)
- `requirements.txt` or `requirements/production.txt`
- `runtime.txt` (Python version)

## Pre-Deployment Checklist

### Security
- [ ] Generate new `SECRET_KEY` for production
- [ ] Set `DEBUG=False`
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Set `CSRF_TRUSTED_ORIGINS` with your domain
- [ ] Use HTTPS (set `SECURE_SSL_REDIRECT=True`)
- [ ] Configure `SECURE_HSTS_SECONDS`

### Database
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Seed initial data if needed: `python manage.py seed_default_roles`
- [ ] Set up database backups

### Static Files
- [ ] Collect static files: `python manage.py collectstatic --noinput`
- [ ] Configure static file serving (Whitenoise / CDN)

### Services
- [ ] PostgreSQL database provisioned
- [ ] Redis instance provisioned (if using Celery)
- [ ] Email service configured (SMTP settings)

### Monitoring
- [ ] Health check endpoint: `/health/live`
- [ ] Metrics endpoint: `/metrics/` (optional)
- [ ] Error tracking configured (Sentry/etc)
- [ ] Log aggregation set up

## Environment Variables

### Required Variables
```bash
# Django Core
SECRET_KEY=<generate-with-django-secret-key-generator>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (if using Celery)
REDIS_URL=redis://host:6379/0

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-password

# Frontend (optional)
VITE_API_BASE_URL=https://yourdomain.com/api
```

### Optional Variables
```bash
# Sentry (Error Tracking)
SENTRY_DSN=https://xxx@sentry.io/xxx

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_STORAGE_BUCKET_NAME=xxx
AWS_S3_REGION_NAME=eu-west-1

# Security
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

## Post-Deployment Tasks

### Initial Setup
```bash
# 1. Run migrations
python manage.py migrate

# 2. Create superuser
python manage.py createsuperuser

# 3. Seed default roles/permissions
python manage.py seed_default_roles

# 4. Warm caches (optional)
python manage.py warm_permission_cache

# 5. Build search index (if using search)
python manage.py rebuild_search_index
```

### Verify Deployment
```bash
# Check health endpoint
curl https://yourdomain.com/health/live

# Check database connection
curl https://yourdomain.com/health/db

# Test authentication
curl https://yourdomain.com/api/accounts/me/
```

## Monitoring & Maintenance

### Health Checks

**Endpoints:**
- `/health/live` - Liveness check (is the app running?)
- `/health/ready` - Readiness check (can the app serve requests?)
- `/health/db` - Database connectivity check

**Configure your platform to monitor these endpoints.**

### Database Backups

**Railway:**
- Automatic daily backups included
- Manual backup: Railway Dashboard → Database → Backups

**Docker/Self-Hosted:**
```bash
# Backup
docker-compose exec db pg_dump -U postgres dbname > backup.sql

# Restore
docker-compose exec -T db psql -U postgres dbname < backup.sql
```

### Log Management

**View Logs:**
```bash
# Railway
railway logs

# Docker
docker-compose logs -f web

# Kubernetes
kubectl logs -f deployment/django-core-web -n django-core
```

### Scaling

**Railway:**
- Horizontal: Increase replicas in `railway.json`
- Vertical: Railway auto-scales based on usage

**Docker:**
```bash
docker-compose -f docker-compose.prod.yml up -d --scale web=3
```

**Kubernetes:**
```bash
kubectl scale deployment django-core-web --replicas=3 -n django-core
```

## Rollback Procedures

### Railway
```bash
# Rollback to previous deployment
railway rollback
```

### Docker
```bash
# Pull previous image version
docker pull your-registry/django-core:previous-tag

# Update docker-compose.yml with previous tag
# Then restart services
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Rollback deployment
kubectl rollout undo deployment/django-core-web -n django-core

# Check rollout status
kubectl rollout status deployment/django-core-web -n django-core
```

## Troubleshooting

### "502 Bad Gateway"
- Check if web process is running
- Verify it's binding to correct port (`$PORT` variable)
- Check logs for startup errors

### "Database connection failed"
- Verify `DATABASE_URL` is set correctly
- Check database is running and accessible
- Verify network/firewall rules

### "Static files not loading"
- Run `collectstatic` command
- Check `STATIC_ROOT` and `STATIC_URL` settings
- Verify web server is serving static files correctly

### "CSRF verification failed"
- Add your domain to `CSRF_TRUSTED_ORIGINS`
- Ensure `ALLOWED_HOSTS` includes your domain
- Check if HTTPS is configured correctly

## Next Steps

- Set up monitoring with [Observability Guide](observability.md)
- Configure database backups
- Set up CI/CD for automated deployments (see [CI/CD Pipeline](../06-workflow/cicd.md))
- Review security checklist in [Constitution](../03-system/constitution.md)
