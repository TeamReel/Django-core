# Configuration Reference
**Feature**: B19 Deployment Templates & Configuration  
**Document Type**: Reference  
**Last Updated**: 2025-12-04

---

## Table of Contents

1. [Required Variables](#required-variables)
2. [Django Core Settings](#django-core-settings)
3. [Database Configuration](#database-configuration)
4. [Redis Configuration](#redis-configuration)
5. [Celery Configuration (B15)](#celery-configuration-b15)
6. [Security Settings (B03)](#security-settings-b03)
7. [Logging & Observability (B18)](#logging--observability-b18)
8. [Docker Compose Variables](#docker-compose-variables)
9. [Cloud Provider Examples](#cloud-provider-examples)
10. [Validation Rules](#validation-rules)

---

## Required Variables

These variables **MUST** be set in all environments:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `SECRET_KEY` | String (50+) | Django cryptographic signing key | 50+ random characters |
| `DATABASE_URL` | URL | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | URL | Redis connection string | `redis://:pass@host:6379/0` |
| `ALLOWED_HOSTS` | CSV | Comma-separated allowed hostnames | `example.com,www.example.com` |
| `CSRF_TRUSTED_ORIGINS` | CSV | Comma-separated trusted HTTPS origins | `https://example.com` |

### Generating SECRET_KEY

```bash
# Method 1: Django management command
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Method 2: OpenSSL
openssl rand -base64 64

# Method 3: Python secrets module
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## Django Core Settings

### DEBUG

**Purpose**: Enable/disable debug mode  
**Type**: Boolean  
**Default**: `False`  
**Values**: `True`, `False`

```bash
# Development
DEBUG=True

# Staging/Production (REQUIRED)
DEBUG=False
```

⚠️ **CRITICAL**: NEVER set `DEBUG=True` in production. Exposes sensitive information and disables security features.

---

### ALLOWED_HOSTS

**Purpose**: Whitelist of allowed hostnames to prevent Host header attacks  
**Type**: Comma-separated list  
**Default**: `[]` (empty list)

```bash
# Development
ALLOWED_HOSTS=localhost,127.0.0.1

# Staging
ALLOWED_HOSTS=staging.example.com

# Production
ALLOWED_HOSTS=example.com,www.example.com,api.example.com
```

**Validation Rules**:
- Required when `DEBUG=False`
- No wildcards allowed (security risk)
- No spaces between values
- Must include all domains serving the application

---

### CSRF_TRUSTED_ORIGINS

**Purpose**: Whitelist of trusted origins for CSRF protection  
**Type**: Comma-separated list of full URLs with scheme  
**Default**: `[]` (empty list)

```bash
# Development (HTTP)
CSRF_TRUSTED_ORIGINS=http://localhost,http://127.0.0.1

# Production (HTTPS - REQUIRED)
CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
```

**Validation Rules**:
- Must include scheme (http:// or https://)
- Required when `DEBUG=False`
- Must match actual request origins
- Use HTTPS in production

---

## Database Configuration

### DATABASE_URL

**Purpose**: PostgreSQL connection string  
**Type**: URL  
**Format**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE[?options]`

#### Local Development

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/django_core_dev
```

#### Docker Compose

```bash
DATABASE_URL=postgresql://postgres:postgres@db:5432/django_core_dev
```

#### AWS RDS

```bash
DATABASE_URL=postgresql://dbuser:dbpassword@mydb.abc123.us-east-1.rds.amazonaws.com:5432/django_core
```

#### GCP Cloud SQL (Unix Socket)

```bash
# With Cloud SQL Proxy
DATABASE_URL=postgresql://dbuser:dbpassword@/django_core?host=/cloudsql/PROJECT:REGION:INSTANCE

# With Public IP
DATABASE_URL=postgresql://dbuser:dbpassword@34.123.45.67:5432/django_core
```

#### Azure PostgreSQL

```bash
DATABASE_URL=postgresql://dbuser@servername:dbpassword@servername.postgres.database.azure.com:5432/django_core?sslmode=require
```

**Validation Rules**:
- Scheme must be `postgresql://` or `postgres://`
- Port defaults to 5432 if omitted
- Special characters in password must be URL-encoded
- Azure requires `sslmode=require` parameter

**Connection Pooling**:
```bash
# Add connection pooling parameters
DATABASE_URL=postgresql://user:pass@host:5432/db?pool_size=10&max_overflow=20
```

---

## Redis Configuration

### REDIS_URL

**Purpose**: Redis connection for caching and Celery broker  
**Type**: URL  
**Format**: `redis://[:PASSWORD@]HOST:PORT/DB[?options]`

#### Local Development

```bash
REDIS_URL=redis://localhost:6379/0
```

#### Docker Compose

```bash
REDIS_URL=redis://redis:6379/0
```

#### With Password

```bash
REDIS_URL=redis://:mypassword@localhost:6379/0
```

#### AWS ElastiCache

```bash
# Without encryption
REDIS_URL=redis://:password@my-redis.abc123.0001.use1.cache.amazonaws.com:6379/0

# With encryption (TLS)
REDIS_URL=rediss://:password@my-redis.abc123.0001.use1.cache.amazonaws.com:6380/0
```

#### GCP Memorystore

```bash
# Standard tier (no auth)
REDIS_URL=redis://10.0.0.3:6379/0

# With AUTH enabled
REDIS_URL=redis://:password@10.0.0.3:6379/0
```

#### Azure Cache for Redis

```bash
# With SSL (required for Azure)
REDIS_URL=redis://:password@myredis.redis.cache.windows.net:6380/0?ssl_cert_reqs=required
```

**Validation Rules**:
- Scheme: `redis://` (plain) or `rediss://` (TLS)
- DB number: 0-15 (default: 0)
- Azure requires `ssl_cert_reqs=required` parameter
- Password must be URL-encoded if contains special characters

---

## Celery Configuration (B15)

### CELERY_BROKER_URL

**Purpose**: Celery message broker connection  
**Type**: URL  
**Default**: Same as `REDIS_URL`

```bash
# Typically same as REDIS_URL
CELERY_BROKER_URL=redis://redis:6379/0

# Can use different Redis DB for separation
CELERY_BROKER_URL=redis://redis:6379/1
```

---

### CELERY_RESULT_BACKEND

**Purpose**: Store task results (optional)  
**Type**: URL or empty  
**Default**: Empty (disabled)

```bash
# Disabled (recommended for performance)
CELERY_RESULT_BACKEND=

# Redis backend
CELERY_RESULT_BACKEND=redis://redis:6379/2

# Database backend
CELERY_RESULT_BACKEND=db+postgresql://user:pass@host:5432/db
```

**Recommendation**: Leave empty unless you need to query task results later. Reduces Redis memory usage.

---

### CELERY_TASK_ALWAYS_EAGER

**Purpose**: Run tasks synchronously (development only)  
**Type**: Boolean  
**Default**: `False`

```bash
# Development (tasks run immediately in same process)
CELERY_TASK_ALWAYS_EAGER=True

# Staging/Production (REQUIRED - use Celery worker)
CELERY_TASK_ALWAYS_EAGER=False
```

⚠️ **WARNING**: NEVER set to `True` in production. Defeats purpose of background task processing.

---

### CELERY_WORKER_CONCURRENCY

**Purpose**: Number of worker threads/processes  
**Type**: Integer  
**Default**: Number of CPU cores  
**Recommendation**: `(2 * CPU_CORES) + 1`

```bash
# 2 CPUs -> 5 workers
CELERY_WORKER_CONCURRENCY=5

# 4 CPUs -> 9 workers
CELERY_WORKER_CONCURRENCY=9

# 8 CPUs -> 17 workers
CELERY_WORKER_CONCURRENCY=17
```

**Validation Rules**:
- Minimum: 1
- Maximum: Depends on available memory (each worker ~100MB)
- For I/O-bound tasks: Higher concurrency
- For CPU-bound tasks: Match CPU core count

---

### CELERY_TASK_SOFT_TIME_LIMIT

**Purpose**: Soft timeout before task warning (seconds)  
**Type**: Integer  
**Default**: `300` (5 minutes)

```bash
# 5 minutes (default)
CELERY_TASK_SOFT_TIME_LIMIT=300

# 10 minutes
CELERY_TASK_SOFT_TIME_LIMIT=600
```

**Behavior**: Raises `SoftTimeLimitExceeded` exception in task, allowing graceful cleanup.

---

### CELERY_TASK_TIME_LIMIT

**Purpose**: Hard timeout before task termination (seconds)  
**Type**: Integer  
**Default**: `600` (10 minutes)

```bash
# 10 minutes (default)
CELERY_TASK_TIME_LIMIT=600

# 20 minutes
CELERY_TASK_TIME_LIMIT=1200
```

**Behavior**: Worker process killed if task exceeds limit. Should be higher than `CELERY_TASK_SOFT_TIME_LIMIT`.

**Validation Rules**:
- Must be > `CELERY_TASK_SOFT_TIME_LIMIT`
- Recommended: `SOFT_LIMIT + 60` seconds buffer

---

## Security Settings (B03)

### SECURE_SSL_REDIRECT

**Purpose**: Force HTTPS redirect for all requests  
**Type**: Boolean  
**Default**: `False`

```bash
# Development/Staging (HTTP)
SECURE_SSL_REDIRECT=False

# Production (HTTPS - REQUIRED)
SECURE_SSL_REDIRECT=True
```

⚠️ **IMPORTANT**: Only enable after SSL certificates are installed and verified.

---

### SESSION_COOKIE_SECURE

**Purpose**: Mark session cookies as secure (HTTPS only)  
**Type**: Boolean  
**Default**: `False`

```bash
# Development (HTTP)
SESSION_COOKIE_SECURE=False

# Production (HTTPS - REQUIRED)
SESSION_COOKIE_SECURE=True
```

**Validation Rules**:
- Must be `True` when `SECURE_SSL_REDIRECT=True`
- Requires HTTPS; cookies won't be sent over HTTP

---

### CSRF_COOKIE_SECURE

**Purpose**: Mark CSRF cookies as secure (HTTPS only)  
**Type**: Boolean  
**Default**: `False`

```bash
# Development (HTTP)
CSRF_COOKIE_SECURE=False

# Production (HTTPS - REQUIRED)
CSRF_COOKIE_SECURE=True
```

**Validation Rules**:
- Must be `True` when `SECURE_SSL_REDIRECT=True`
- Requires HTTPS; CSRF protection won't work over HTTP

---

### SECURE_HSTS_SECONDS

**Purpose**: HTTP Strict Transport Security duration (seconds)  
**Type**: Integer  
**Default**: `0` (disabled)

```bash
# Development (disabled)
SECURE_HSTS_SECONDS=0

# Staging (short duration for testing)
SECURE_HSTS_SECONDS=3600

# Production (1 year - RECOMMENDED)
SECURE_HSTS_SECONDS=31536000
```

**Validation Rules**:
- Set to `0` to disable
- Recommended production value: `31536000` (1 year)
- Only enable after verifying HTTPS works correctly
- Cannot be easily reverted (browsers cache policy)

---

### SECURE_HSTS_INCLUDE_SUBDOMAINS

**Purpose**: Apply HSTS to all subdomains  
**Type**: Boolean  
**Default**: `False`

```bash
# Development (disabled)
SECURE_HSTS_INCLUDE_SUBDOMAINS=False

# Production (if all subdomains support HTTPS)
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
```

⚠️ **WARNING**: Only enable if ALL subdomains support HTTPS. Breaks HTTP-only subdomains.

---

## Logging & Observability (B18)

### LOGGING_LEVEL

**Purpose**: Application logging verbosity  
**Type**: String  
**Default**: `INFO`  
**Values**: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

```bash
# Development (verbose)
LOGGING_LEVEL=DEBUG

# Staging
LOGGING_LEVEL=INFO

# Production
LOGGING_LEVEL=WARNING
```

**Log Levels**:
- `DEBUG`: All messages (very verbose)
- `INFO`: General information events
- `WARNING`: Warning messages (default for production)
- `ERROR`: Error events (serious issues)
- `CRITICAL`: Critical failures only

---

### PROMETHEUS_METRICS_ENABLED

**Purpose**: Enable /metrics endpoint for Prometheus scraping  
**Type**: Boolean  
**Default**: `True`

```bash
# All environments (recommended)
PROMETHEUS_METRICS_ENABLED=True

# Disable if not using Prometheus
PROMETHEUS_METRICS_ENABLED=False
```

**Endpoints**:
- `/metrics` - Prometheus metrics (Django, Celery, system)
- Scraped by Prometheus server
- Protected in production (see Nginx config)

---

### SENTRY_DSN

**Purpose**: Sentry error tracking DSN  
**Type**: URL or empty  
**Default**: Empty (disabled)

```bash
# Disabled
SENTRY_DSN=

# Enabled (production recommended)
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

**Benefits**:
- Real-time error notifications
- Stack traces and context
- Performance monitoring
- Release tracking

---

## Docker Compose Variables

### DOCKER_IMAGE

**Purpose**: Docker image tag for production deployment  
**Type**: String  
**Default**: N/A (only for docker-compose.prod.yml)

```bash
# Production deployment
DOCKER_IMAGE=your-registry/django-core:1.0.0

# Staging
DOCKER_IMAGE=your-registry/django-core:staging
```

---

### Database Credentials (Docker Compose local/staging)

```bash
# PostgreSQL
POSTGRES_DB=django_core_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Redis
REDIS_PASSWORD=
```

⚠️ **SECURITY**: Use strong passwords in staging/production. Never use defaults.

---

## Cloud Provider Examples

### AWS

```bash
# RDS PostgreSQL
DATABASE_URL=postgresql://dbuser:dbpass@mydb.abc123.us-east-1.rds.amazonaws.com:5432/django_core

# ElastiCache Redis
REDIS_URL=redis://:password@my-redis.abc123.0001.use1.cache.amazonaws.com:6379/0

# S3 for static files (optional)
AWS_STORAGE_BUCKET_NAME=my-django-static
AWS_S3_REGION_NAME=us-east-1
```

---

### GCP

```bash
# Cloud SQL (Unix socket with Cloud SQL Proxy)
DATABASE_URL=postgresql://dbuser:dbpass@/django_core?host=/cloudsql/project-id:us-central1:instance-name

# Cloud SQL (Public IP)
DATABASE_URL=postgresql://dbuser:dbpass@34.123.45.67:5432/django_core

# Memorystore Redis
REDIS_URL=redis://10.0.0.3:6379/0

# Cloud Storage for static files (optional)
GCS_BUCKET_NAME=my-django-static
```

---

### Azure

```bash
# Azure Database for PostgreSQL
DATABASE_URL=postgresql://dbuser@servername:dbpass@servername.postgres.database.azure.com:5432/django_core?sslmode=require

# Azure Cache for Redis
REDIS_URL=redis://:password@myredis.redis.cache.windows.net:6380/0?ssl_cert_reqs=required

# Azure Blob Storage for static files (optional)
AZURE_ACCOUNT_NAME=mystorageaccount
AZURE_CONTAINER=django-static
```

---

## Validation Rules

### General

| Rule | Description |
|------|-------------|
| **No spaces in CSV** | Comma-separated values must not contain spaces |
| **URL encoding** | Special characters in URLs must be encoded |
| **No quotes** | Values should not be wrapped in quotes |
| **Boolean format** | Use `True`/`False` (capitalized) |
| **Integer format** | No decimal points or commas |

---

### Security Requirements (Production)

| Variable | Required Value |
|----------|----------------|
| `DEBUG` | `False` |
| `SECRET_KEY` | 50+ random characters |
| `ALLOWED_HOSTS` | Actual domains (no wildcards) |
| `SECURE_SSL_REDIRECT` | `True` |
| `SESSION_COOKIE_SECURE` | `True` |
| `CSRF_COOKIE_SECURE` | `True` |
| `SECURE_HSTS_SECONDS` | `31536000` (1 year) |

---

### Performance Recommendations

| Variable | Recommendation |
|----------|----------------|
| `CELERY_WORKER_CONCURRENCY` | `(2 * CPU) + 1` |
| `CELERY_RESULT_BACKEND` | Leave empty (unless needed) |
| `LOGGING_LEVEL` | `WARNING` (production) |
| `CELERY_TASK_TIME_LIMIT` | `SOFT_LIMIT + 60` |

---

## Environment-Specific Configurations

### Development

```bash
DEBUG=True
SECRET_KEY=dev-key-not-for-production
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/django_core_dev
REDIS_URL=redis://localhost:6379/0
CELERY_TASK_ALWAYS_EAGER=True
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
LOGGING_LEVEL=DEBUG
```

---

### Staging

```bash
DEBUG=False
SECRET_KEY=<generate-unique-key>
ALLOWED_HOSTS=staging.example.com
CSRF_TRUSTED_ORIGINS=https://staging.example.com
DATABASE_URL=postgresql://user:pass@staging-db:5432/django_core_staging
REDIS_URL=redis://:pass@staging-redis:6379/0
CELERY_TASK_ALWAYS_EAGER=False
SECURE_SSL_REDIRECT=False  # HTTP for staging
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
LOGGING_LEVEL=INFO
PROMETHEUS_METRICS_ENABLED=True
```

---

### Production

```bash
DEBUG=False
SECRET_KEY=<generate-unique-50-plus-char-key>
ALLOWED_HOSTS=example.com,www.example.com
CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
DATABASE_URL=postgresql://user:pass@prod-rds.amazonaws.com:5432/django_core
REDIS_URL=redis://:pass@prod-elasticache.amazonaws.com:6379/0
CELERY_TASK_ALWAYS_EAGER=False
CELERY_WORKER_CONCURRENCY=9
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
LOGGING_LEVEL=WARNING
PROMETHEUS_METRICS_ENABLED=True
SENTRY_DSN=https://your-dsn@sentry.io/project
```

---

## Troubleshooting

### "ImproperlyConfigured: SECRET_KEY must not be empty"

**Solution**: Set `SECRET_KEY` in .env file with 50+ random characters.

---

### "Invalid DATABASE_URL format"

**Solution**: Verify URL format: `postgresql://user:pass@host:port/db`  
Check for special characters needing URL encoding.

---

### "CSRF verification failed"

**Solution**: Add request origin to `CSRF_TRUSTED_ORIGINS` with scheme (`https://example.com`)

---

### "Connection refused" to database/Redis

**Solution**:
1. Verify service is running
2. Check firewall rules
3. Verify credentials
4. Test connection: `psql $DATABASE_URL` or `redis-cli -u $REDIS_URL`

---

## See Also

- [Quickstart Guide](quickstart.md) - Deployment instructions
- [Troubleshooting Guide](troubleshooting.md) - Common issues
- [Cloud Providers Guide](cloud-providers.md) - Cloud-specific configurations
- [.env.example](../../.env.example) - Template with all variables
