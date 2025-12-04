# Deployment Troubleshooting Guide
**Feature**: B19 Deployment Templates & Configuration  
**Document Type**: Troubleshooting  
**Last Updated**: 2025-12-04

---

## Table of Contents

1. [Local Development Issues](#local-development-issues)
2. [Docker Build Issues](#docker-build-issues)
3. [Docker Compose Issues](#docker-compose-issues)
4. [Database Issues](#database-issues)
5. [Redis/Celery Issues](#rediscelery-issues)
6. [Nginx Issues](#nginx-issues)
7. [Kubernetes Issues](#kubernetes-issues)
8. [SSL/TLS Issues](#ssltls-issues)
9. [Performance Issues](#performance-issues)
10. [Security & Access Issues](#security--access-issues)

---

## Local Development Issues

### Problem: Port Already in Use

**Error**:
```
Error starting userland proxy: listen tcp4 0.0.0.0:8000: bind: address already in use
```

**Symptoms**:
- Docker Compose fails to start
- "Port 8000/5432/6379 already in use" error

**Solution**:

```bash
# Find process using port
lsof -ti:8000

# Kill process
lsof -ti:8000 | xargs kill -9

# Or kill all processes on port
sudo kill -9 $(sudo lsof -t -i:8000)

# Alternative: Use different port
# Edit docker-compose.local.yml
ports:
  - "8001:8000"  # Host:Container
```

---

### Problem: Hot-Reload Not Working

**Symptoms**:
- Code changes don't reflect in running application
- Need to restart Docker containers to see changes

**Solution**:

```bash
# 1. Verify volume mount in docker-compose.local.yml
docker-compose -f docker-compose.local.yml config | grep volumes
# Should show: - .:/app

# 2. Check file ownership (Mac/Linux)
ls -la  # Should be your user, not root

# 3. Restart with clean state
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up

# 4. For Docker Desktop on Windows: Ensure file sharing enabled
# Settings → Resources → File Sharing → Add project directory
```

---

### Problem: Database Migration Errors

**Error**:
```
django.db.utils.OperationalError: relation "accounts_user" does not exist
```

**Symptoms**:
- Fresh database but tables not created
- Migration errors on startup

**Solution**:

```bash
# 1. Reset database (removes all data)
docker-compose down -v  # -v removes volumes
docker-compose up

# 2. Run migrations manually
docker-compose exec web python manage.py migrate

# 3. Check migration status
docker-compose exec web python manage.py showmigrations

# 4. If migrations stuck, fake them (CAREFUL!)
docker-compose exec web python manage.py migrate --fake <app_name> <migration_name>
```

---

## Docker Build Issues

### Problem: ModuleNotFoundError During Build

**Error**:
```
ModuleNotFoundError: No module named 'config'
```

**Symptoms**:
- Docker build succeeds but container fails to start
- collectstatic or migrate commands fail

**Root Cause**: Django `src/` directory not in PYTHONPATH

**Solution**:

Verify Dockerfile contains PYTHONPATH fix (line 42):
```dockerfile
ENV PYTHONPATH="/app/src:$PYTHONPATH"
```

If missing, rebuild:
```bash
docker build --no-cache -t django-core:latest .
```

---

### Problem: Permission Denied Errors

**Error**:
```
PermissionError: [Errno 13] Permission denied: '/app/staticfiles/admin'
```

**Symptoms**:
- collectstatic fails
- Static files not writable

**Root Cause**: Commands run as root before switching to django user

**Solution**:

Verify Dockerfile has USER django BEFORE collectstatic (line 63):
```dockerfile
USER django  # Line 63
RUN python manage.py collectstatic --noinput --clear  # Line 66
```

Rebuild if incorrect:
```bash
docker build --no-cache -t django-core:latest .
```

---

### Problem: Build Cache Issues

**Symptoms**:
- Old dependencies still present
- Code changes not reflected in image

**Solution**:

```bash
# Full clean rebuild
docker build --no-cache -t django-core:latest .

# Remove all build cache
docker builder prune -a -f
```

---

## Docker Compose Issues

### Problem: Services Not Starting

**Error**:
```
ERROR: Service 'web' failed to build
```

**Diagnostic Steps**:

```bash
# 1. Check all services status
docker-compose ps

# 2. View logs
docker-compose logs web
docker-compose logs db
docker-compose logs redis

# 3. Check environment variables
docker-compose config  # Shows merged config with env vars

# 4. Validate compose file syntax
docker-compose -f docker-compose.local.yml config
```

---

### Problem: Health Checks Failing

**Symptoms**:
- Services show "unhealthy" in `docker-compose ps`
- Containers restart repeatedly

**Solution**:

```bash
# 1. Check health check logs
docker inspect <container_id> | grep -A 10 Health

# 2. Test health endpoint manually
docker-compose exec web curl http://localhost:8000/health/live

# 3. Verify health check endpoint exists
docker-compose exec web python manage.py check

# 4. Increase health check timeout in docker-compose.yml
healthcheck:
  interval: 30s
  timeout: 10s  # Increase if needed
  retries: 5
  start_period: 60s  # Increase for slow startups
```

---

### Problem: Database Connection Refused

**Error**:
```
django.db.utils.OperationalError: could not connect to server: Connection refused
```

**Symptoms**:
- Web service can't connect to database
- "Connection refused" or "Name or service not known"

**Solution**:

```bash
# 1. Verify database service running
docker-compose ps db  # Should show "Up"

# 2. Check DATABASE_URL format
echo $DATABASE_URL
# Should match service name: postgresql://postgres:postgres@db:5432/django_core_dev

# 3. Test connection from web container
docker-compose exec web python manage.py check --database default

# 4. Check database logs
docker-compose logs db

# 5. Verify network connectivity
docker-compose exec web ping db
```

---

## Database Issues

### Problem: PostgreSQL Container Won't Start

**Error**:
```
PostgreSQL Database directory appears to contain a database; Skipping initialization
```

**Symptoms**:
- Database container exits immediately
- Old data preventing fresh start

**Solution**:

```bash
# 1. Remove volumes and restart
docker-compose down -v
docker-compose up -d db
docker-compose logs db

# 2. If still failing, remove named volumes
docker volume ls | grep django
docker volume rm <volume_name>

# 3. Nuclear option: Remove all Docker data (CAREFUL!)
docker system prune -a --volumes
```

---

### Problem: Migration Lock Errors

**Error**:
```
django.db.utils.OperationalError: database is locked
```

**Symptoms**:
- Multiple migration processes running
- Migration hangs indefinitely

**Solution**:

```bash
# 1. Kill all migration processes
docker-compose exec web pkill -f migrate

# 2. Run single migration
docker-compose exec web python manage.py migrate --run-syncdb

# 3. For PostgreSQL, check for locks
docker-compose exec db psql -U postgres -d django_core_dev -c "SELECT * FROM pg_locks WHERE NOT granted;"

# 4. Clear locks (PostgreSQL)
docker-compose exec db psql -U postgres -d django_core_dev -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

---

### Problem: Database Performance Issues

**Symptoms**:
- Slow queries
- High database CPU usage

**Diagnostic Steps**:

```bash
# 1. Check slow queries (PostgreSQL)
docker-compose exec db psql -U postgres -d django_core_dev -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 2. Check connection count
docker-compose exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Enable query logging
# Add to docker-compose.yml:
environment:
  - POSTGRES_INITDB_ARGS=-c log_statement=all

# 4. Tune database connections in settings
# config/settings/base.py:
DATABASES = {
    'default': {
        'CONN_MAX_AGE': 600,  # Connection pooling
    }
}
```

---

## Redis/Celery Issues

### Problem: Celery Workers Not Processing Tasks

**Symptoms**:
- Tasks queued but never executed
- Celery logs show "No messages received"

**Solution**:

```bash
# 1. Verify Celery worker running
docker-compose ps celery-worker  # Should show "Up"

# 2. Check worker logs
docker-compose logs celery-worker

# 3. Verify CELERY_BROKER_URL
docker-compose exec web python -c "from django.conf import settings; print(settings.CELERY_BROKER_URL)"

# 4. Test Redis connection
docker-compose exec web python -c "import redis; r = redis.from_url('redis://redis:6379/0'); print(r.ping())"

# 5. Check task queue
docker-compose exec redis redis-cli LLEN celery

# 6. Purge old tasks
docker-compose exec web python manage.py shell
>>> from celery import current_app
>>> current_app.control.purge()

# 7. Restart workers
docker-compose restart celery-worker celery-beat
```

---

### Problem: Celery Beat Not Scheduling Tasks

**Symptoms**:
- Periodic tasks not running
- Beat logs show errors

**Solution**:

```bash
# 1. Verify only ONE beat instance running (CRITICAL)
docker-compose ps celery-beat  # Should show only 1 container

# 2. Check beat logs
docker-compose logs celery-beat

# 3. Verify beat schedule file
docker-compose exec celery-beat ls -la /tmp/celerybeat-schedule

# 4. Remove stale schedule file
docker-compose exec celery-beat rm /tmp/celerybeat-schedule
docker-compose restart celery-beat

# 5. Check periodic tasks registered
docker-compose exec web python manage.py shell
>>> from celery import current_app
>>> print(current_app.conf.beat_schedule)
```

---

### Problem: Redis Connection Timeouts

**Error**:
```
redis.exceptions.TimeoutError: Timeout reading from socket
```

**Symptoms**:
- Intermittent connection failures
- Slow cache/Celery operations

**Solution**:

```bash
# 1. Check Redis memory usage
docker-compose exec redis redis-cli INFO memory

# 2. Check max memory policy
docker-compose exec redis redis-cli CONFIG GET maxmemory-policy

# 3. Set eviction policy (if needed)
# Add to docker-compose.yml:
command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

# 4. Increase socket timeout
# In settings:
REDIS_URL = "redis://redis:6379/0?socket_timeout=10&socket_connect_timeout=10"

# 5. Check network latency
docker-compose exec web ping redis
```

---

## Nginx Issues

### Problem: 502 Bad Gateway

**Symptoms**:
- Nginx returns 502 error
- "upstream prematurely closed connection"

**Solution**:

```bash
# 1. Check Django service running
docker-compose ps web  # Should show "Up (healthy)"

# 2. Verify Gunicorn listening on port 8000
docker-compose exec web netstat -tulpn | grep 8000

# 3. Check Nginx upstream configuration
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf | grep proxy_pass
# Should be: proxy_pass http://web:8000;

# 4. Check Nginx error logs
docker-compose logs nginx | grep error

# 5. Test direct connection to Django
docker-compose exec nginx curl http://web:8000/health/live

# 6. Increase Nginx timeouts
# In nginx config:
proxy_connect_timeout 300;
proxy_send_timeout 300;
proxy_read_timeout 300;
```

---

### Problem: Static Files Not Loading (404)

**Symptoms**:
- CSS/JS/images return 404
- /static/ paths not found

**Solution**:

```bash
# 1. Verify collectstatic ran during build
docker-compose exec web ls -la /app/staticfiles/
# Should show admin/, css/, js/ directories

# 2. Check Nginx volume mount
docker-compose exec nginx ls -la /app/staticfiles/
# Should show same files as web container

# 3. Verify Nginx static file configuration
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf | grep -A 3 "location /static"
# Should have: alias /app/staticfiles/;

# 4. Check file permissions
docker-compose exec nginx ls -la /app/staticfiles/admin/
# Files should be readable (r-- or rw-)

# 5. Rebuild image and run collectstatic
docker build -t django-core:latest .
docker-compose up -d web
docker-compose exec web python manage.py collectstatic --noinput
```

---

### Problem: SSL Certificate Errors

**Error**:
```
nginx: [emerg] cannot load certificate "/etc/nginx/ssl/fullchain.pem": BIO_new_file() failed
```

**Symptoms**:
- Nginx fails to start with SSL config
- Certificate file not found

**Solution**:

```bash
# 1. Verify certificate files exist
ls -la ssl/
# Should show fullchain.pem and privkey.pem

# 2. Check file permissions
chmod 644 ssl/fullchain.pem
chmod 600 ssl/privkey.pem

# 3. Verify volume mount in docker-compose.prod.yml
volumes:
  - ./ssl:/etc/nginx/ssl:ro  # Read-only mount

# 4. Test certificate validity
openssl x509 -in ssl/fullchain.pem -text -noout

# 5. For Let's Encrypt, renew certificates
sudo certbot renew
sudo cp /etc/letsencrypt/live/example.com/*.pem ssl/
```

---

## Kubernetes Issues

### Problem: Pods Stuck in Pending

**Symptoms**:
- Pods never start
- `kubectl get pods` shows "Pending" status

**Solution**:

```bash
# 1. Describe pod to see events
kubectl describe pod <pod-name>

# Common causes:
# - Insufficient resources (CPU/memory)
# - Image pull errors
# - PersistentVolumeClaim issues
# - Node selector mismatch

# 2. Check node resources
kubectl top nodes
kubectl describe nodes

# 3. Check PVC status
kubectl get pvc

# 4. Reduce resource requests temporarily
# Edit deployment:
resources:
  requests:
    memory: "128Mi"  # Lower value
    cpu: "100m"
```

---

### Problem: Image Pull Errors

**Error**:
```
Failed to pull image "your-registry/django-core:latest": rpc error: code = Unknown
```

**Symptoms**:
- Pods show "ImagePullBackOff" or "ErrImagePull"

**Solution**:

```bash
# 1. Verify image exists
docker pull your-registry/django-core:latest

# 2. Create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=your-registry \
  --docker-username=your-username \
  --docker-password=your-password \
  --docker-email=your-email

# 3. Add secret to deployment
spec:
  imagePullSecrets:
  - name: regcred

# 4. For GKE, configure Workload Identity
# For EKS, use IAM roles for service accounts
# For AKS, use ACR integration
```

---

### Problem: Readiness Probe Failing

**Symptoms**:
- Pods running but not receiving traffic
- `kubectl get pods` shows "0/1" ready

**Solution**:

```bash
# 1. Check pod logs
kubectl logs <pod-name>

# 2. Test health endpoint manually
kubectl port-forward <pod-name> 8000:8000
curl http://localhost:8000/health/ready

# 3. Increase probe timing
# In deployment:
readinessProbe:
  initialDelaySeconds: 30  # Increase if slow startup
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# 4. Check database/Redis connectivity from pod
kubectl exec -it <pod-name> -- python manage.py check --database default
```

---

### Problem: Secrets Not Found

**Error**:
```
Error from server (NotFound): secrets "django-core-secrets" not found
```

**Symptoms**:
- Pods crash with "env variable not set" errors

**Solution**:

```bash
# 1. Verify secret exists
kubectl get secret django-core-secrets

# 2. Check secret contents (encoded)
kubectl describe secret django-core-secrets

# 3. Recreate secret
kubectl delete secret django-core-secrets  # If exists
kubectl create secret generic django-core-secrets \
  --from-literal=SECRET_KEY="your-secret-key" \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=REDIS_URL="redis://..."

# 4. Verify secret keys match deployment env vars
kubectl get deployment django-web -o yaml | grep -A 10 secretKeyRef
```

---

### Problem: Service Not Accessible

**Symptoms**:
- External IP not assigned
- Cannot access application from outside cluster

**Solution**:

```bash
# 1. Check service status
kubectl get svc django-web-service

# 2. For LoadBalancer type, wait for external IP
# Can take 2-5 minutes on cloud providers

# 3. If stuck in <pending>, check cloud provider quotas
# AWS: ELB limits
# GCP: External IP address quota
# Azure: Load balancer SKU

# 4. Alternative: Use NodePort temporarily
# Edit service:
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 8000
    nodePort: 30080

# Access via: http://<node-ip>:30080

# 5. Check firewall rules
# Ensure port 80/443 allowed from 0.0.0.0/0
```

---

## SSL/TLS Issues

### Problem: SSL Certificate Not Valid

**Symptoms**:
- Browser shows "Your connection is not private"
- Certificate expired or self-signed warnings

**Solution**:

```bash
# 1. Check certificate validity
openssl x509 -in ssl/fullchain.pem -text -noout | grep -A 2 Validity

# 2. Renew Let's Encrypt certificate
sudo certbot renew --force-renewal

# 3. Copy renewed certificates
sudo cp /etc/letsencrypt/live/example.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/example.com/privkey.pem ssl/

# 4. Restart Nginx
docker-compose restart nginx

# 5. Verify certificate chain
openssl s_client -connect example.com:443 -showcerts
```

---

### Problem: Mixed Content Warnings

**Symptoms**:
- HTTPS page loads but some resources blocked
- "Mixed Content" errors in browser console

**Solution**:

```bash
# 1. Verify SECURE_SSL_REDIRECT=True
grep SECURE_SSL_REDIRECT .env

# 2. Check CSRF_TRUSTED_ORIGINS uses https://
CSRF_TRUSTED_ORIGINS=https://example.com

# 3. Verify Django settings
# config/settings/production.py:
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# 4. Check Nginx X-Forwarded-Proto header
# nginx config:
proxy_set_header X-Forwarded-Proto $scheme;

# 5. Audit static files for HTTP links
grep -r "http://" src/static/
```

---

## Performance Issues

### Problem: High Memory Usage

**Symptoms**:
- Containers getting OOM killed
- "Out of memory" errors

**Solution**:

```bash
# 1. Check current memory usage
docker stats

# 2. Reduce Gunicorn workers
# docker-compose.yml:
command: gunicorn config.wsgi:application --workers 2 --bind 0.0.0.0:8000

# 3. Reduce Celery concurrency
CELERY_WORKER_CONCURRENCY=2

# 4. Enable memory limits
# docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 512M

# 5. Profile memory usage
docker-compose exec web python -m memory_profiler manage.py runserver
```

---

### Problem: Slow Response Times

**Symptoms**:
- Requests taking >5 seconds
- High latency

**Diagnostic Steps**:

```bash
# 1. Check Django debug toolbar (development only)
pip install django-debug-toolbar

# 2. Profile slow endpoints
docker-compose exec web python -m cProfile -o profile.stats manage.py runserver

# 3. Check database query count
# Enable logging:
LOGGING = {
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
        },
    },
}

# 4. Add database indexes
# models.py:
class Meta:
    indexes = [
        models.Index(fields=['user', 'created_at']),
    ]

# 5. Enable Redis caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL'),
    }
}
```

---

## Security & Access Issues

### Problem: CSRF Verification Failed

**Error**:
```
Forbidden (403): CSRF verification failed. Request aborted.
```

**Symptoms**:
- POST requests fail with 403
- Forms don't submit

**Solution**:

```bash
# 1. Verify CSRF_TRUSTED_ORIGINS includes request origin
echo $CSRF_TRUSTED_ORIGINS
# Must include https://example.com (with scheme)

# 2. Check cookies are being set
# Browser DevTools → Application → Cookies
# Should see csrftoken cookie

# 3. Verify CSRF_COOKIE_SECURE matches protocol
# For HTTPS:
CSRF_COOKIE_SECURE=True

# For HTTP (development):
CSRF_COOKIE_SECURE=False

# 4. Check SameSite cookie policy
# settings.py:
CSRF_COOKIE_SAMESITE = 'Lax'  # or 'None' for cross-origin

# 5. Test with curl
curl -v https://example.com/api/endpoint/ \
  -H "X-CSRFToken: <token-from-cookie>" \
  -b "csrftoken=<token>" \
  -d "data=value"
```

---

### Problem: Permission Denied on Files

**Symptoms**:
- Cannot write to logs
- collectstatic fails
- Media upload errors

**Solution**:

```bash
# 1. Check file ownership
docker-compose exec web ls -la /app/

# 2. Fix ownership (run as django user UID 1000)
docker-compose exec web chown -R 1000:1000 /app/staticfiles/
docker-compose exec web chown -R 1000:1000 /app/mediafiles/

# 3. Verify Dockerfile uses non-root user
# Dockerfile should have:
USER django  # Before commands that write files

# 4. For mounted volumes, fix host ownership
sudo chown -R $USER:$USER ./staticfiles/
```

---

## Getting Help

### Diagnostic Commands

```bash
# Full system status
docker-compose ps
docker-compose logs
docker stats

# Django checks
docker-compose exec web python manage.py check
docker-compose exec web python manage.py check --deploy

# Database check
docker-compose exec web python manage.py check --database default

# Celery inspect
docker-compose exec celery-worker celery -A config inspect active
docker-compose exec celery-worker celery -A config inspect stats

# Kubernetes status
kubectl get all
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous  # Previous crash logs
```

---

### Log Aggregation

Enable centralized logging for easier troubleshooting:

```bash
# Docker logging driver
# docker-compose.yml:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

# Or use external logging (production)
logging:
  driver: "syslog"
  options:
    syslog-address: "tcp://logs.example.com:514"
```

---

## See Also

- [Quickstart Guide](quickstart.md) - Deployment instructions
- [Configuration Reference](configuration-reference.md) - Environment variables
- [Cloud Providers Guide](cloud-providers.md) - Cloud-specific issues
- [Security Checklist](../security-checklist.md) - Security best practices
