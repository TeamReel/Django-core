# Deployment Templates

Production deployment templates for Celery infrastructure.

## Systemd (Recommended for Linux servers)

### Worker Service
File: `celery-worker.service`

**Install**:
```bash
sudo cp celery-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable celery-worker
sudo systemctl start celery-worker
```

**Monitor**:
```bash
sudo systemctl status celery-worker
sudo journalctl -u celery-worker -f
```

**Manage**:
```bash
# Stop worker
sudo systemctl stop celery-worker

# Restart worker
sudo systemctl restart celery-worker

# Disable autostart
sudo systemctl disable celery-worker
```

### Beat Scheduler Service
File: `celery-beat.service`

**Install**:
```bash
sudo cp celery-beat.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable celery-beat
sudo systemctl start celery-beat
```

**Monitor**:
```bash
sudo systemctl status celery-beat
sudo journalctl -u celery-beat -f
```

**⚠️ Important**: Only ONE beat scheduler per deployment. Never run multiple beat services.

## Supervisor (Alternative)

### Configuration
Files: `supervisor-celery.conf`, `supervisor-celery-beat.conf`

**Install**:
```bash
sudo cp supervisor-celery*.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
```

**Monitor**:
```bash
# Check status
sudo supervisorctl status

# View logs
sudo supervisorctl tail celery-worker
sudo supervisorctl tail celery-beat

# Restart
sudo supervisorctl restart celery-worker
sudo supervisorctl restart celery-beat
```

## Docker & Kubernetes

See `docs/tasks/running-workers.md` for container deployment examples including:
- Docker Compose configuration
- Kubernetes deployments
- Scaling strategies

## Pre-Deployment Checklist

- [ ] Redis accessible from workers (test connection)
- [ ] Environment variables configured (see `.env.production.example`)
- [ ] User `django` exists with appropriate permissions
- [ ] Log directories created: `/var/log/celery`
- [ ] PID directory created: `/var/run/celery`
- [ ] Application code deployed to `/opt/django-core-app` (or update paths in templates)
- [ ] Python virtual environment activated
- [ ] Dependencies installed: `pip install -r requirements/production.txt`
- [ ] Database migrations applied
- [ ] Static files collected

## Directory Structure

```
/opt/django-core-app/
├── venv/                    # Python virtual environment
├── src/                     # Django application code
├── manage.py
├── requirements/
│   ├── base.txt
│   └── production.txt
└── logs/                    # Application logs
    ├── celery-worker.log
    └── celery-beat.log

/var/run/celery/            # PID files
├── worker.pid
└── beat.pid

/var/log/celery/            # System logs (if using syslog)
```

## Security Considerations

### 1. Run as Non-Root User

All templates configured to run as `django` user:
```bash
# Create user
sudo useradd -r -s /bin/false django

# Set permissions
sudo chown -R django:django /opt/django-core-app
sudo chown -R django:django /var/log/celery
sudo chown -R django:django /var/run/celery
```

### 2. Environment Variables

Never hardcode secrets in service files. Use environment files:

**Systemd**:
```ini
[Service]
EnvironmentFile=/opt/django-core-app/.env.production
```

**Supervisor**:
```ini
[program:celery-worker]
environment=DJANGO_SETTINGS_MODULE="config.settings.production"
```

### 3. Log File Permissions

```bash
sudo chmod 640 /var/log/celery/*.log
sudo chown django:django /var/log/celery/*.log
```

### 4. Redis Security

- Use password authentication: `redis://:<password>@localhost:6379/0`
- Use separate Redis namespace per environment
- Restrict Redis network access (bind to localhost or private network)

### 5. Firewall Configuration

```bash
# Allow Redis only from local network
sudo ufw allow from 10.0.0.0/8 to any port 6379
```

## Monitoring

### Health Checks

**HTTP Endpoint**:
```bash
curl http://localhost:8000/health/tasks/
```

**CLI Command**:
```bash
python manage.py check_workers --exit-code
```

Use in monitoring systems (Nagios, Zabbix, etc.) for automated alerts.

### Log Rotation

Configure logrotate for Celery logs:

```bash
# /etc/logrotate.d/celery
/var/log/celery/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
    postrotate
        systemctl reload celery-worker
        systemctl reload celery-beat
    endscript
}
```

### Prometheus Metrics

If using `django-prometheus`, configure metrics scraping:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'django-celery'
    static_configs:
      - targets: ['localhost:8000']
```

## Troubleshooting Deployment

### Service Won't Start

1. Check service logs:
```bash
sudo journalctl -u celery-worker -n 50
```

2. Verify paths in service file:
```bash
# Check WorkingDirectory exists
ls -la /opt/django-core-app

# Check Python executable
/opt/django-core-app/venv/bin/python --version
```

3. Test command manually:
```bash
sudo -u django /opt/django-core-app/venv/bin/celery -A config worker -l info
```

### Permission Errors

```bash
# Fix ownership
sudo chown -R django:django /opt/django-core-app
sudo chown -R django:django /var/log/celery
sudo chown -R django:django /var/run/celery

# Fix permissions
sudo chmod 755 /opt/django-core-app
sudo chmod 750 /var/log/celery
```

### Connection Errors

1. Verify Redis running:
```bash
systemctl status redis
redis-cli ping
```

2. Test connection from worker user:
```bash
sudo -u django redis-cli -h localhost -p 6379 ping
```

3. Check environment variables:
```bash
systemctl show celery-worker --property=Environment
```

## Updating Services

### Code Updates

```bash
# 1. Pull new code
cd /opt/django-core-app
git pull

# 2. Install dependencies
source venv/bin/activate
pip install -r requirements/production.txt

# 3. Restart workers
sudo systemctl restart celery-worker
sudo systemctl restart celery-beat
```

### Configuration Updates

```bash
# 1. Update service file
sudo cp celery-worker.service /etc/systemd/system/

# 2. Reload systemd
sudo systemctl daemon-reload

# 3. Restart service
sudo systemctl restart celery-worker
```

## Backup Considerations

### Beat Scheduler State

The file `celerybeat-schedule` contains beat scheduler state:

- **Location**: Project root (or specified via `--schedule` flag)
- **Backup**: Include in regular backups if using settings-based schedules
- **Recovery**: Beat will regenerate if missing (some executions may be delayed)

### Redis Persistence

Configure Redis persistence for task queue durability:

```bash
# redis.conf
appendonly yes
appendfsync everysec
```

## Further Reading

- [Systemd Service Management](https://www.freedesktop.org/software/systemd/man/systemctl.html)
- [Supervisor Documentation](http://supervisord.org/)
- [Celery Daemonization](https://docs.celeryproject.org/en/stable/userguide/daemonizing.html)
- [Running Workers Guide](../tasks/running-workers.md)
