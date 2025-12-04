# Deployment Quickstart Guide
**Feature**: B19 Deployment Templates & Configuration  
**Document Type**: Quickstart  
**Last Updated**: 2025-12-04

---

## Table of Contents

1. [Local Development Setup](#local-development-setup) (<5 minutes)
2. [Staging Environment](#staging-environment)
3. [Production Deployment](#production-deployment) (<30 minutes)
4. [Kubernetes Deployment](#kubernetes-deployment) (<2 minutes)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

**Goal**: Run Django Core-App locally with hot-reload in under 5 minutes.

### Prerequisites

- Docker Desktop installed and running
- Git repository cloned
- 8GB+ RAM recommended

### Steps

1. **Create local environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Start all services**:
   ```bash
   docker-compose -f docker-compose.local.yml up
   ```

3. **Access the application**:
   - **Web**: http://localhost:8000
   - **Admin**: http://localhost:8000/admin
   - **Health Check**: http://localhost:8000/health/live
   - **Metrics**: http://localhost:8000/metrics

4. **Development workflow**:
   - **Edit code**: Changes hot-reload automatically (no restart needed)
   - **Run migrations**: `docker-compose exec web python manage.py migrate`
   - **Create superuser**: `docker-compose exec web python manage.py createsuperuser`
   - **View logs**: `docker-compose logs -f web`
   - **Stop services**: `Ctrl+C` then `docker-compose down`

### Local Services

| Service | Port | Description |
|---------|------|-------------|
| Django Web | 8000 | Development server with hot-reload |
| PostgreSQL | 5432 | Local database |
| Redis | 6379 | Cache and Celery broker |
| Celery Worker | - | Background task processing |
| Celery Beat | - | Periodic task scheduling |

### Success Criteria

✅ Application accessible at http://localhost:8000  
✅ Health check returns 200 OK  
✅ Code changes reload automatically  
✅ All services running (`docker-compose ps` shows 5 services)  

---

## Staging Environment

**Goal**: Production-like environment for testing before deployment.

### Prerequisites

- Docker and Docker Compose installed
- `.env` file with staging configuration
- PostgreSQL and Redis (can be local or external)

### Steps

1. **Build production image**:
   ```bash
   docker build -t django-core:staging .
   ```

2. **Create staging environment file**:
   ```bash
   cp .env.example .env.staging
   # Edit .env.staging with staging values
   ```

3. **Set required variables** in `.env.staging`:
   ```bash
   SECRET_KEY=<generate-with-django-get-random-secret-key>
   DATABASE_PASSWORD=<secure-password>
   REDIS_PASSWORD=<secure-password>
   ALLOWED_HOSTS=staging.example.com,localhost
   CSRF_TRUSTED_ORIGINS=https://staging.example.com
   ```

4. **Start staging services**:
   ```bash
   docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d
   ```

5. **Verify deployment**:
   ```bash
   # Check all services running
   docker-compose -f docker-compose.staging.yml ps
   
   # Check health
   curl http://localhost/health/ready
   
   # Check logs
   docker-compose -f docker-compose.staging.yml logs -f web
   ```

6. **Access staging**:
   - **Web**: http://localhost (Nginx on port 80)
   - **Metrics**: http://localhost/metrics
   - **Prometheus**: http://localhost:9090 (optional monitoring)

### Staging Configuration

| Feature | Setting |
|---------|---------|
| DEBUG | False |
| Database | Local PostgreSQL (can be external) |
| Redis | Local Redis with password |
| Nginx | Included (reverse proxy) |
| SSL | Not required (HTTP only) |
| Observability | Full (B18 health/metrics/logging) |
| Celery | Worker + Beat services |

### Success Criteria

✅ All services healthy (`docker-compose ps` shows "Up (healthy)")  
✅ Nginx serving on port 80  
✅ Health checks passing (/health/ready returns 200)  
✅ Metrics accessible at /metrics  
✅ Static files served by Nginx  
✅ Background tasks processing (check Celery logs)  

---

## Production Deployment

**Goal**: Deploy Django Core-App to production server in under 30 minutes.

### Prerequisites

- **Server**: Linux VPS with Docker and Docker Compose
- **Database**: External PostgreSQL (AWS RDS, GCP Cloud SQL, Azure Database)
- **Cache**: External Redis (AWS ElastiCache, GCP Memorystore, Azure Cache)
- **Domain**: DNS configured to server IP
- **SSL**: SSL/TLS certificate (Let's Encrypt recommended)

### Steps

#### 1. Prepare Server

```bash
# Install Docker and Docker Compose (Ubuntu example)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

#### 2. Build and Push Image

```bash
# Build production image
docker build -t your-registry/django-core:1.0.0 .

# Push to registry (Docker Hub, AWS ECR, GCP GCR, etc.)
docker push your-registry/django-core:1.0.0
```

#### 3. Configure Production Environment

```bash
# Create .env file on server
cat > .env <<EOF
# Django Core
SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
DEBUG=False
ALLOWED_HOSTS=example.com,www.example.com
CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com

# Database (AWS RDS example)
DATABASE_URL=postgresql://dbuser:dbpass@mydb.abc123.us-east-1.rds.amazonaws.com:5432/django_core

# Redis (AWS ElastiCache example)
REDIS_URL=redis://:redispass@my-redis.abc123.0001.use1.cache.amazonaws.com:6379/0
CELERY_BROKER_URL=redis://:redispass@my-redis.abc123.0001.use1.cache.amazonaws.com:6379/0

# Security (B03)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Observability (B18)
LOGGING_LEVEL=INFO
PROMETHEUS_METRICS_ENABLED=True
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Docker Image
DOCKER_IMAGE=your-registry/django-core:1.0.0
EOF
```

#### 4. Set Up SSL Certificates

```bash
# Using Let's Encrypt (certbot)
sudo apt-get install certbot
sudo certbot certonly --standalone -d example.com -d www.example.com

# Copy certificates to project directory
mkdir -p ssl
sudo cp /etc/letsencrypt/live/example.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/example.com/privkey.pem ssl/
sudo chown -R $USER:$USER ssl/
```

#### 5. Configure Nginx for SSL

```nginx
# See nginx/production.conf for full example
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # Security headers (B03)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    location / {
        proxy_pass http://web:8000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
        proxy_redirect off;
    }
    
    location /static/ {
        alias /app/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 6. Deploy Application

```bash
# Pull docker-compose.prod.yml to server
scp docker-compose.prod.yml user@server:/app/

# On server: Start services
cd /app
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
curl https://example.com/health/ready
```

#### 7. Verify Production Deployment

```bash
# Check all services healthy
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f web

# Verify SSL
curl -I https://example.com

# Check health endpoints
curl https://example.com/health/live
curl https://example.com/health/ready

# Check metrics (B18)
curl https://example.com/metrics
```

### Production Checklist

- [ ] SECRET_KEY generated (50+ random characters)
- [ ] DEBUG=False in .env
- [ ] ALLOWED_HOSTS configured with actual domains
- [ ] External PostgreSQL database configured and accessible
- [ ] External Redis configured and accessible
- [ ] SSL certificates installed and Nginx configured
- [ ] SECURE_SSL_REDIRECT=True in .env
- [ ] Static files collected and served by Nginx
- [ ] Health checks passing (/health/live, /health/ready)
- [ ] Metrics endpoint accessible (/metrics)
- [ ] Celery worker and beat running
- [ ] Sentry configured for error tracking (optional but recommended)
- [ ] Firewall configured (allow 80, 443; restrict 8000, 5432, 6379)
- [ ] Backup strategy in place for database
- [ ] Monitoring alerts configured (health check failures, high CPU/memory)

### Success Criteria

✅ Application accessible via HTTPS  
✅ SSL certificate valid (no browser warnings)  
✅ Health checks passing  
✅ Static files loading correctly  
✅ Background tasks processing  
✅ Prometheus metrics available  
✅ No errors in logs  
✅ Database migrations applied  
✅ Zero-downtime updates working  

### Zero-Downtime Updates

```bash
# Build new image version
docker build -t your-registry/django-core:1.0.1 .
docker push your-registry/django-core:1.0.1

# Update .env with new image tag
sed -i 's/DOCKER_IMAGE=.*/DOCKER_IMAGE=your-registry\/django-core:1.0.1/' .env

# Pull new image
docker-compose -f docker-compose.prod.yml pull

# Update services one at a time (zero downtime)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build web

# Verify health
curl https://example.com/health/ready

# Update workers
docker-compose -f docker-compose.prod.yml up -d --no-deps celery-worker
docker-compose -f docker-compose.prod.yml up -d --no-deps celery-beat
```

---

## Kubernetes Deployment

**Goal**: Deploy Django Core-App to Kubernetes cluster in under 2 minutes.

### Prerequisites

- **Kubernetes Cluster**: GKE, EKS, AKS, or on-prem cluster
- **kubectl**: Configured to access cluster
- **Container Registry**: Image pushed to registry accessible by cluster
- **External Services**: PostgreSQL and Redis (managed services recommended)

### Quick Start

1. **Create namespace** (optional):
   ```bash
   kubectl create namespace django-core
   kubectl config set-context --current --namespace=django-core
   ```

2. **Configure secrets**:
   ```bash
   # Create secret from .env file
   kubectl create secret generic django-core-secrets \
     --from-literal=SECRET_KEY="your-secret-key-here" \
     --from-literal=DATABASE_URL="postgresql://user:pass@host:5432/db" \
     --from-literal=REDIS_URL="redis://:pass@host:6379/0" \
     --from-literal=CELERY_BROKER_URL="redis://:pass@host:6379/0"
   ```

3. **Update ConfigMap** with your domains:
   ```bash
   # Edit k8s/configmap.yaml
   # Update ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS
   ```

4. **Update image references** in Deployments:
   ```bash
   # Replace "your-registry/django-core:latest" with your actual image
   sed -i 's|your-registry/django-core:latest|myregistry.com/django-core:1.0.0|g' k8s/*.yaml
   ```

5. **Apply manifests**:
   ```bash
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secret.yaml
   kubectl apply -f k8s/deployment-web.yaml
   kubectl apply -f k8s/deployment-celery-worker.yaml
   kubectl apply -f k8s/deployment-celery-beat.yaml
   kubectl apply -f k8s/service-web.yaml
   kubectl apply -f k8s/hpa-web.yaml  # Optional autoscaling
   ```

6. **Verify deployment**:
   ```bash
   # Check all pods running
   kubectl get pods -l app=django-core
   
   # Check services
   kubectl get svc django-web-service
   
   # Get external IP (LoadBalancer)
   kubectl get svc django-web-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   
   # Check health
   EXTERNAL_IP=$(kubectl get svc django-web-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
   curl http://$EXTERNAL_IP/health/ready
   ```

### Kubernetes Manifest Summary

| Manifest | Purpose | Replicas |
|----------|---------|----------|
| configmap.yaml | Non-sensitive config | - |
| secret.yaml | Credentials (DB, Redis) | - |
| deployment-web.yaml | Django + Gunicorn | 3 (autoscales) |
| deployment-celery-worker.yaml | Task workers | 2 |
| deployment-celery-beat.yaml | Task scheduler | 1 (critical) |
| service-web.yaml | LoadBalancer | - |
| hpa-web.yaml | Autoscaling (optional) | 3-10 |

### Kubernetes Features

- **Zero-downtime**: Rolling updates with readiness probes
- **Health checks**: B18 endpoints (/health/live, /health/ready)
- **Autoscaling**: HPA based on CPU/memory
- **Observability**: Prometheus annotations for metrics scraping
- **Security**: Non-root containers, pod security policies
- **Separation**: Independent scaling of web/worker/beat

### Success Criteria

✅ All pods in Running state  
✅ Health checks passing (readiness probes green)  
✅ External IP assigned to LoadBalancer Service  
✅ Application accessible via external IP  
✅ Metrics endpoint working (/metrics)  
✅ HPA configured and monitoring (kubectl get hpa)  

---

## Environment Variables Reference

See [configuration-reference.md](configuration-reference.md) for complete catalog with validation rules.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django cryptographic key | 50+ random characters |
| `DATABASE_URL` | PostgreSQL connection | postgresql://user:pass@host:5432/db |
| `REDIS_URL` | Redis connection | redis://:pass@host:6379/0 |
| `ALLOWED_HOSTS` | Allowed hostnames | example.com,www.example.com |
| `CSRF_TRUSTED_ORIGINS` | Trusted origins | https://example.com |

### Security Variables (B03)

| Variable | Production | Development |
|----------|------------|-------------|
| `DEBUG` | False | True |
| `SECURE_SSL_REDIRECT` | True | False |
| `SESSION_COOKIE_SECURE` | True | False |
| `CSRF_COOKIE_SECURE` | True | False |

### Observability Variables (B18)

| Variable | Description | Default |
|----------|-------------|---------|
| `LOGGING_LEVEL` | Log verbosity | INFO |
| `PROMETHEUS_METRICS_ENABLED` | Enable /metrics | True |
| `SENTRY_DSN` | Error tracking | (optional) |

### Celery Variables (B15)

| Variable | Description | Recommendation |
|----------|-------------|----------------|
| `CELERY_WORKER_CONCURRENCY` | Tasks per worker | (2 * CPU) + 1 |
| `CELERY_TASK_SOFT_TIME_LIMIT` | Task warning (s) | 300 |
| `CELERY_TASK_TIME_LIMIT` | Task timeout (s) | 600 |

---

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for comprehensive issue resolution guide.

### Quick Fixes

| Issue | Solution |
|-------|----------|
| Port already in use | `lsof -ti:8000 \| xargs kill -9` |
| Database migration errors | `docker-compose down -v` (resets volumes) |
| Hot-reload not working | Verify volume mount: `.:/app` |
| 502 Bad Gateway | Check Gunicorn logs, verify port 8000 |
| Static files 404 | Run collectstatic, check Nginx volume |
| Database connection refused | Verify DATABASE_URL format |
| Pods stuck Pending | Check resources, image pull errors |
| Readiness probe failing | Check logs, test /health/ready |

---

## Next Steps

- [ ] Configure monitoring (Prometheus + Grafana)
- [ ] Set up log aggregation (ELK, Loki, CloudWatch)
- [ ] Configure automated backups (database, Redis)
- [ ] Set up CI/CD pipeline (GitHub Actions, GitLab CI)
- [ ] Review security checklist (docs/security-checklist.md)
- [ ] Configure rate limiting (via Nginx or API Gateway)
- [ ] Set up CDN for static files (CloudFront, Cloudflare)

---

## Support

- **Configuration Reference**: [configuration-reference.md](configuration-reference.md)
- **Troubleshooting**: [troubleshooting.md](troubleshooting.md)
- **Cloud Providers**: [cloud-providers.md](cloud-providers.md)
- **Alternatives**: [alternatives.md](alternatives.md)
- **Architecture Decisions**: ../../adr/
