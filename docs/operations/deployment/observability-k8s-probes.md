# Kubernetes Deployment with Observability Probes

This example shows how to configure Kubernetes liveness and readiness probes for the Django Core application with Platform Observability Foundation.

---

## Complete Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: django-core-app
  namespace: production
  labels:
    app: django-core
    component: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: django-core
      component: web

  template:
    metadata:
      labels:
        app: django-core
        component: web

    spec:
      containers:
      - name: django-app
        image: your-registry/django-core-app:latest

        ports:
        - name: http
          containerPort: 8000
          protocol: TCP

        env:
        - name: DJANGO_SETTINGS_MODULE
          value: "config.settings.production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: django-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: django-secrets
              key: redis-url
        - name: OBSERVABILITY_HEALTH_CHECKS_ENABLED
          value: "true"
        - name: OBSERVABILITY_METRICS_ENABLED
          value: "true"

        # Liveness Probe: Checks if process is alive
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
            scheme: HTTP
          initialDelaySeconds: 10  # Wait 10s after container starts
          periodSeconds: 10         # Check every 10 seconds
          timeoutSeconds: 5         # Request must complete within 5s
          successThreshold: 1       # 1 success = healthy
          failureThreshold: 3       # 3 failures = restart container

        # Readiness Probe: Checks if app can serve traffic
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
            scheme: HTTP
          initialDelaySeconds: 5    # Wait 5s after container starts
          periodSeconds: 10         # Check every 10 seconds
          timeoutSeconds: 5         # Request must complete within 5s
          successThreshold: 1       # 1 success = add to load balancer
          failureThreshold: 2       # 2 failures = remove from load balancer

        # Resource limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Service Definition with Prometheus Annotations

```yaml
apiVersion: v1
kind: Service
metadata:
  name: django-core-app
  namespace: production
  labels:
    app: django-core
    component: web
  annotations:
    # Prometheus scrape annotations
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
spec:
  selector:
    app: django-core
    component: web
  ports:
  - name: http
    port: 80
    targetPort: 8000
    protocol: TCP
  type: ClusterIP
```

---

## Probe Configuration Rationale

### Liveness Probe Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| `initialDelaySeconds: 10` | 10 seconds | Allows Django to initialize (load settings, connect to DB) |
| `periodSeconds: 10` | 10 seconds | Balances responsiveness vs overhead |
| `timeoutSeconds: 5` | 5 seconds | `/health/live` should be instant; 5s is generous |
| `failureThreshold: 3` | 3 failures | Prevents spurious restarts during transient issues |

**What it checks**: Process is alive (no deadlocks, no crashes)

**Failure behavior**: Kubernetes restarts the container after 3 consecutive failures (30 seconds total)

### Readiness Probe Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| `initialDelaySeconds: 5` | 5 seconds | Shorter than liveness; checks dependencies quickly |
| `periodSeconds: 10` | 10 seconds | Same as liveness for consistency |
| `timeoutSeconds: 5` | 5 seconds | `/health/ready` checks DB/Redis; 5s is reasonable timeout |
| `failureThreshold: 2` | 2 failures | Faster removal from load balancer (20 seconds) |

**What it checks**: Database, Redis queue, pending migrations

**Failure behavior**: Pod removed from Service endpoints after 2 consecutive failures (20 seconds total)

---

## Troubleshooting

### Pod Stuck in "Not Ready" State

**Symptoms**:
```bash
kubectl get pods
# NAME                              READY   STATUS    RESTARTS
# django-core-app-abc123-xyz        0/1     Running   0
```

**Diagnosis**:
```bash
# Check readiness probe failures
kubectl describe pod django-core-app-abc123-xyz | grep -A 10 "Readiness"

# Check logs for dependency errors
kubectl logs django-core-app-abc123-xyz --tail=50
```

**Common causes**:
1. Database not reachable
2. Redis queue not reachable
3. Pending migrations

**Solutions**:
- Increase `initialDelaySeconds` if migrations take >5 seconds
- Verify DATABASE_URL and REDIS_URL secrets
- Check network policies allow pod → database/redis traffic

### Pod Restarts Frequently

**Symptoms**:
```bash
kubectl get pods
# NAME                              READY   STATUS    RESTARTS
# django-core-app-abc123-xyz        1/1     Running   12
```

**Diagnosis**:
```bash
# Check liveness probe failures
kubectl describe pod django-core-app-abc123-xyz | grep -A 10 "Liveness"

# Check previous container logs
kubectl logs django-core-app-abc123-xyz --previous
```

**Common causes**:
1. Application deadlock or hang
2. Memory exhaustion (OOMKilled)
3. Timeout too short for slow startup

**Solutions**:
- Increase `initialDelaySeconds` if startup takes >10 seconds
- Increase memory limits if OOMKilled
- Check application logs for deadlocks or infinite loops

---

## Advanced Configurations

### Custom Health Check Timeouts

If your application has slow database queries or large migrations:

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 30  # ← Increase for slow migrations
  periodSeconds: 15        # ← Increase check interval
  timeoutSeconds: 10       # ← Allow more time for DB queries
  failureThreshold: 2
```

### Separate Startup Probe (Kubernetes 1.16+)

For apps with very slow startup (e.g., large Django projects with many apps):

```yaml
startupProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30  # ← Allow up to 150 seconds (30 * 5s) for startup

livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

Startup probe disables liveness checks until first success, preventing premature restarts.

---

## See Also

- [Platform Observability Guide](../observability.md)
- [Troubleshooting Guide](../observability-troubleshooting.md)
- [Prometheus Scrape Configuration](observability-prometheus-scrape.yaml)
- [Kubernetes Probes Documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
