# Kubernetes Deployment - Django Core

Production-ready Kubernetes manifests for deploying Django Core application with multi-service separation (web, Celery worker, Celery beat).

## Prerequisites

- Kubernetes cluster (1.25+) with kubectl configured
- Container registry with Django Core image pushed
- PostgreSQL and Redis (external services or in-cluster)
- Metrics Server installed (for HPA)

## Quick Start

### 1. Update Image References

Replace `your-registry/django-core:latest` in all deployment files with your actual image:

```bash
# Find all image references
grep "your-registry" k8s/*.yaml

# Update using sed (Linux/Mac)
sed -i 's|your-registry/django-core:latest|gcr.io/my-project/django-core:v1.0.0|g' k8s/*.yaml

# Or manually edit deployment-web.yaml, deployment-celery-worker.yaml, deployment-celery-beat.yaml
```

### 2. Create Kubernetes Secret

**NEVER commit secrets to version control!** Create secret via kubectl:

```bash
kubectl create secret generic django-core-secrets \
  --from-literal=SECRET_KEY="$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')" \
  --from-literal=DATABASE_URL="postgresql://user:pass@postgres-host:5432/django_core" \
  --from-literal=REDIS_URL="redis://:pass@redis-host:6379/0" \
  --from-literal=CELERY_BROKER_URL="redis://:pass@redis-host:6379/0"
```

Alternatively, encode values and update `secret.yaml`:

```bash
echo -n "your-secret-key" | base64
# Copy output to secret.yaml data.SECRET_KEY
```

### 3. Update ConfigMap

Edit `configmap.yaml` and replace placeholder domains:

```yaml
ALLOWED_HOSTS: "example.com,www.example.com,api.example.com"
CSRF_TRUSTED_ORIGINS: "https://example.com,https://www.example.com"
```

### 4. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Verify deployment
kubectl get pods -l app=django-core
kubectl get svc django-web-service

# Check logs
kubectl logs -l component=web
kubectl logs -l component=celery-worker
kubectl logs -l component=celery-beat

# Check HPA status
kubectl get hpa django-web-hpa
```

### 5. Access Application

```bash
# Get LoadBalancer external IP
kubectl get svc django-web-service

# Wait for EXTERNAL-IP (may take 1-2 minutes)
# Access: http://<EXTERNAL-IP>/

# Health checks
curl http://<EXTERNAL-IP>/health/live
curl http://<EXTERNAL-IP>/health/ready
```

## Architecture

### Services

| Component | Replicas | Purpose | Scaling |
|-----------|----------|---------|---------|
| **django-web** | 3-10 | Gunicorn web server | HPA (CPU/Memory) |
| **celery-worker** | 2+ | Background task processing | Manual or queue-based HPA |
| **celery-beat** | 1 | Periodic task scheduler | **NEVER scale** (must be 1) |

### Resources

**Web Tier:**
- Requests: 256Mi memory, 250m CPU
- Limits: 512Mi memory, 500m CPU

**Worker Tier:**
- Requests: 512Mi memory, 250m CPU
- Limits: 1Gi memory, 1000m CPU

**Beat Tier:**
- Requests: 128Mi memory, 100m CPU
- Limits: 256Mi memory, 500m CPU

## Configuration

### ConfigMap (Non-Sensitive)

Edit `configmap.yaml` for:
- Django settings (DEBUG, ALLOWED_HOSTS, CSRF origins)
- Security settings (B03: SSL redirect, secure cookies, HSTS)
- Observability (B18: logging level, Prometheus metrics)
- Celery configuration (B15: concurrency, timeouts)

### Secret (Sensitive)

Create via kubectl (recommended) or edit `secret.yaml` for:
- SECRET_KEY (Django secret key)
- DATABASE_URL (PostgreSQL connection)
- REDIS_URL (Redis connection)
- CELERY_BROKER_URL (Celery broker, typically same as Redis)
- SENTRY_DSN (optional, error tracking)

## Health Checks (B18 Integration)

All health probes use endpoints from B18 Health Check & Readiness system:

- **Liveness**: `/health/live` - Is container alive?
- **Readiness**: `/health/ready` - Can container serve traffic?
- **Startup**: `/health/live` - Initial startup check (60s max)

## Monitoring (B18 Integration)

### Prometheus Metrics

Web pods have annotations for automatic Prometheus scraping:

```yaml
prometheus.io/scrape: "true"
prometheus.io/port: "8000"
prometheus.io/path: "/metrics"
```

Metrics available at `http://<pod-ip>:8000/metrics`.

### HPA Monitoring

```bash
# Watch HPA decisions
kubectl get hpa django-web-hpa -w

# Check current metrics
kubectl top pods -l component=web

# Describe HPA events
kubectl describe hpa django-web-hpa
```

## Scaling

### Web Tier (Automatic)

HorizontalPodAutoscaler scales web pods between 3-10 replicas based on:
- CPU utilization > 70%
- Memory utilization > 80%

Scale-up: Aggressive (50% or 2 pods after 60s)  
Scale-down: Conservative (25% or 1 pod after 300s)

### Worker Tier (Manual)

```bash
# Scale workers based on queue depth
kubectl scale deployment django-celery-worker --replicas=5

# Or use queue-based HPA (advanced, requires custom metrics)
```

### Beat Tier (NEVER Scale)

**CRITICAL**: Celery beat must have exactly 1 replica. Multiple beat instances cause duplicate task execution.

## Troubleshooting

### Pods Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Check init container (migrations)
kubectl logs <pod-name> -c migrate
```

### Database Connection Issues

```bash
# Verify secret exists
kubectl get secret django-core-secrets

# Check secret contents (base64-encoded)
kubectl get secret django-core-secrets -o yaml

# Test connection from pod
kubectl exec -it <pod-name> -- python -c "import os; print(os.getenv('DATABASE_URL'))"
```

### LoadBalancer Pending

```bash
# Check service status
kubectl describe svc django-web-service

# Verify cloud provider permissions (AWS IAM, GCP roles)
# Check cluster load balancer quota
```

### HPA Not Working

```bash
# Verify Metrics Server installed
kubectl get deployment metrics-server -n kube-system

# Check if metrics available
kubectl top pods

# If not, install Metrics Server:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Celery Beat Duplicate Tasks

**Cause**: Multiple beat replicas running.

**Fix**: Verify `deployment-celery-beat.yaml` has `replicas: 1`:

```bash
kubectl get deployment django-celery-beat
# DESIRED should be 1

# If multiple, scale down:
kubectl scale deployment django-celery-beat --replicas=1
```

## Security (B03 Integration)

- Non-root user (UID 1000) in all containers
- Read-only root filesystem where possible
- Dropped capabilities (drop ALL)
- SSL redirect enforced (SECURE_SSL_REDIRECT=True)
- Secure cookies (SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True)
- HSTS headers (31536000 seconds = 1 year)

## Cloud Provider Notes

### AWS (EKS)

LoadBalancer provisions Classic ELB or Network Load Balancer. Uncomment annotations in `service-web.yaml` for:
- NLB: `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"`
- SSL: `service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:..."`

### GCP (GKE)

LoadBalancer provisions TCP Load Balancer. Use BackendConfig for advanced features:
- CDN, Cloud Armor, IAP, custom health checks

### Azure (AKS)

LoadBalancer provisions Azure Load Balancer. Uncomment annotations for:
- Internal LB: `service.beta.kubernetes.io/azure-load-balancer-internal: "true"`

## Advanced: Ingress Controller

For path-based routing, SSL termination, rate limiting:

1. Install Nginx Ingress Controller or Traefik
2. Change `service-web.yaml` type to `ClusterIP`
3. Create Ingress resource (see WP03 nginx configuration)

## Production Recommendations

1. **External Secrets**: Use AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault with External Secrets Operator
2. **Persistent Beat Schedule**: Mount PersistentVolume for `/tmp/celerybeat-schedule` (optional)
3. **Database Backups**: Automated backups of PostgreSQL
4. **Redis Persistence**: Enable AOF or RDB for Redis
5. **Resource Tuning**: Monitor actual usage and adjust requests/limits
6. **Network Policies**: Restrict pod-to-pod communication
7. **Pod Disruption Budgets**: Ensure minimum availability during updates
8. **Monitoring**: Prometheus + Grafana for metrics, Sentry for error tracking

## Files

- `configmap.yaml` - Non-sensitive configuration
- `secret.yaml` - Sensitive credentials template
- `deployment-web.yaml` - Django web tier (Gunicorn)
- `deployment-celery-worker.yaml` - Celery task workers
- `deployment-celery-beat.yaml` - Celery beat scheduler (1 replica only)
- `service-web.yaml` - LoadBalancer service for web tier
- `hpa-web.yaml` - HorizontalPodAutoscaler for web tier

## Related Documentation

- [B03 Security Baseline](../docs/security-audit-wp10.md)
- [B15 Tasks & Scheduling](../docs/tasks/)
- [B18 Platform Observability](../docs/observability.md)
- [Deployment Guide](../docs/deployment/)
