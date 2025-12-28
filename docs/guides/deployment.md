# Deployment Guide

This guide covers deploying the Django Core-App to production environments.

## Quick Links

| Resource | Description |
|----------|-------------|
| [Quickstart](../deployment/quickstart.md) | Fast deployment checklist |
| [Configuration Reference](../deployment/configuration-reference.md) | All configuration options |
| [Cloud Providers](../deployment/cloud-providers.md) | AWS, GCP, Azure guides |
| [Troubleshooting](../deployment/troubleshooting.md) | Deployment issues |

## Deployment Options

### Systemd (Linux Servers)

Recommended for dedicated Linux servers.

**Templates**:
- [celery-worker.service](../deployment/celery-worker.service)
- [celery-beat.service](../deployment/celery-beat.service)

See [Deployment README](../deployment/README.md) for installation instructions.

### Supervisor

Alternative process manager.

**Templates**:
- [supervisor-celery.conf](../deployment/supervisor-celery.conf)
- [supervisor-celery-beat.conf](../deployment/supervisor-celery-beat.conf)

### Kubernetes

Container orchestration for scalable deployments.

**Manifests**:
- [k8s-celery-worker.yaml](../deployment/k8s-celery-worker.yaml)
- [k8s-redis-secret.yaml](../deployment/k8s-redis-secret.yaml)
- [observability-k8s-probes.yaml](../deployment/observability-k8s-probes.yaml)

## Pre-Deployment Checklist

### Environment

- [ ] Python 3.12+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed from `requirements/production.txt`
- [ ] Environment variables configured

### Database

- [ ] PostgreSQL 14+ available
- [ ] Database created
- [ ] Migrations applied: `python manage.py migrate`
- [ ] SSL/TLS enabled for database connection

### Redis

- [ ] Redis 6+ available
- [ ] Authentication configured
- [ ] Connection tested from application server

### Django

- [ ] `DEBUG = False`
- [ ] `SECRET_KEY` set from environment
- [ ] `ALLOWED_HOSTS` configured
- [ ] Static files collected: `python manage.py collectstatic`
- [ ] Security checks pass: `python manage.py check --deploy`

### Celery

- [ ] Worker process configured
- [ ] Beat scheduler configured (single instance only!)
- [ ] Log directories created
- [ ] PID directories created

## Environment Variables

Essential environment variables for production:

```bash
# Django
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=<50+ character random string>
ALLOWED_HOSTS=api.example.com,www.example.com
DEBUG=false

# Database
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=require

# Redis
REDIS_URL=redis://:password@host:6379/0

# Email
EMAIL_HOST=smtp.example.com
EMAIL_HOST_USER=noreply@example.com
EMAIL_HOST_PASSWORD=<email password>

# Security
SECURE_SSL_REDIRECT=true
SECURE_HSTS_SECONDS=31536000
```

See [Configuration Reference](../deployment/configuration-reference.md) for all options.

## Deployment Steps

### 1. Prepare Server

```bash
# Create application user
sudo useradd -r -s /bin/false django

# Create directories
sudo mkdir -p /opt/django-core-app
sudo mkdir -p /var/log/celery
sudo mkdir -p /var/run/celery

# Set ownership
sudo chown -R django:django /opt/django-core-app
sudo chown -R django:django /var/log/celery
sudo chown -R django:django /var/run/celery
```

### 2. Deploy Code

```bash
cd /opt/django-core-app

# Clone or update code
git clone https://github.com/your-org/django-core.git .
# or: git pull origin main

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements/production.txt
```

### 3. Configure Environment

```bash
# Create environment file
cat > .env.production << 'EOF'
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=your-secret-key-here
# ... other variables
EOF

# Secure the file
chmod 600 .env.production
```

### 4. Initialize Database

```bash
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser  # if needed
```

### 5. Install Services

```bash
# Copy service files
sudo cp deployment/celery-worker.service /etc/systemd/system/
sudo cp deployment/celery-beat.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable celery-worker celery-beat
sudo systemctl start celery-worker celery-beat
```

### 6. Configure Web Server

Configure nginx/Apache as reverse proxy. Example nginx config:

```nginx
upstream django {
    server unix:///var/run/django/gunicorn.sock;
}

server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /opt/django-core-app/staticfiles/;
    }
}
```

### 7. Verify Deployment

```bash
# Check services
sudo systemctl status celery-worker celery-beat

# Check health endpoint
curl -k https://localhost/health/

# Check logs
sudo journalctl -u celery-worker -f
```

## Monitoring

### Health Checks

The application exposes health endpoints:

| Endpoint | Purpose |
|----------|---------|
| `/health/` | Application health |
| `/health/db/` | Database connectivity |
| `/health/redis/` | Redis connectivity |
| `/health/tasks/` | Celery worker status |

### Prometheus Metrics

If using Prometheus, configure scraping:

```yaml
scrape_configs:
  - job_name: 'django-core'
    static_configs:
      - targets: ['localhost:8000']
```

See [observability-prometheus-scrape.yaml](../deployment/observability-prometheus-scrape.yaml).

### Log Rotation

Configure logrotate:

```bash
# /etc/logrotate.d/celery
/var/log/celery/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
}
```

## Updating

### Code Updates

```bash
cd /opt/django-core-app
source venv/bin/activate

# Pull changes
git pull origin main

# Update dependencies
pip install -r requirements/production.txt

# Apply migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Restart services
sudo systemctl restart celery-worker celery-beat gunicorn
```

### Zero-Downtime Updates

For zero-downtime deployments:

1. Deploy to staging first
2. Run migrations (ensure backward compatibility)
3. Deploy new code
4. Restart workers one at a time
5. Verify health checks

## Troubleshooting

See [Deployment Troubleshooting](../deployment/troubleshooting.md) for common issues.

### Quick Checks

```bash
# Check service status
sudo systemctl status celery-worker

# View recent logs
sudo journalctl -u celery-worker -n 100

# Test Redis connection
redis-cli -h localhost ping

# Test database connection
python manage.py dbshell
```

## Related Documentation

- [Deployment README](../deployment/README.md) - Full deployment templates
- [Configuration Reference](../deployment/configuration-reference.md) - All settings
- [Cloud Providers](../deployment/cloud-providers.md) - Cloud-specific guides
- [Observability](../observability.md) - Monitoring setup
