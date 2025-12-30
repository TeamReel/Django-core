# Go-Live Checklist

**Target**: Deploy Django Core-App reference webapp with real database and public URL
**Date**: 2025-12-30
**Status**: Pre-deployment preparation complete

## Pre-Deployment Verification ✅

- [x] Test suite passing (2072/2090 tests, 99.1% pass rate)
- [x] All debug prints removed
- [x] Skipped tests documented with justification
- [x] Database migrations tested locally
- [x] Demo data seeding verified
- [x] Authentication flows tested (org admin, project admin, player)
- [x] Permission boundaries verified
- [x] Credit balance consistency confirmed

## Hosting Options

### Recommended: Render.com (Easiest)
- **Pros**: Free tier available, automatic PostgreSQL, easy GitHub integration, zero config deploys
- **Cons**: Cold starts on free tier, US/EU regions only

### Alternative: Fly.io
- **Pros**: Global edge deployment, generous free tier, PostgreSQL included
- **Cons**: Requires Dockerfile (already have), CLI-based setup

### Alternative: Railway.app
- **Pros**: Simple setup, great DX, automatic PostgreSQL
- **Cons**: Free tier limited, pricing can scale quickly

---

## Deployment Steps (Render.com)

### 1. Prepare Repository

#### a) Create render.yaml (Infrastructure as Code)
```yaml
services:
  - type: web
    name: django-core-app
    env: python
    region: frankfurt  # or oregon
    plan: free  # or starter ($7/mo)
    buildCommand: "pip install -r requirements/production.txt && python src/manage.py collectstatic --noinput"
    startCommand: "gunicorn --chdir src config.wsgi:application --bind 0.0.0.0:$PORT"
    healthCheckPath: /health/
    envVars:
      - key: PYTHON_VERSION
        value: 3.12.4
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.production
      - key: SECRET_KEY
        generateValue: true
      - key: ALLOWED_HOSTS
        value: .onrender.com
      - key: DATABASE_URL
        fromDatabase:
          name: django-core-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: django-core-redis
          type: redis
          property: connectionString
      - key: CELERY_BROKER_URL
        fromService:
          name: django-core-redis
          type: redis
          property: connectionString

databases:
  - name: django-core-db
    databaseName: django_core_production
    user: django_core_user
    plan: free  # 90 days free, then $7/mo

  - type: redis
    name: django-core-redis
    plan: free  # 25MB, enough for cache + celery
    maxmemoryPolicy: allkeys-lru
```

#### b) Create production settings file
**File**: `src/config/settings/production.py`
```python
from .base import *
import dj_database_url

DEBUG = False

# Security settings
SECRET_KEY = env("SECRET_KEY")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[".onrender.com"])
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Database from DATABASE_URL (Render provides this)
DATABASES = {
    "default": dj_database_url.config(
        conn_max_age=600,
        conn_health_checks=True,
        ssl_require=True,
    )
}

# Static files with WhiteNoise
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Insert WhiteNoise middleware after SecurityMiddleware (robust)
try:
    security_index = MIDDLEWARE.index("django.middleware.security.SecurityMiddleware")
    MIDDLEWARE.insert(security_index + 1, "whitenoise.middleware.WhiteNoiseMiddleware")
except ValueError:
    MIDDLEWARE.append("whitenoise.middleware.WhiteNoiseMiddleware")

# Cache and Celery from REDIS_URL
DATABASES = {
    "default": dj_database_url.config(
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Static files (whitenoise handles this)
STATICFILES_STORAGE = \"whitenoise.storage.CompressedManifestStaticFilesStorage\"
# WhiteNoise middleware insertion shown in render.yaml section above

# Caching with Redis
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

# Celery with Redis
CELERY_BROKER_URL = env("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
```

#### c) Create requirements/production.txt
```txt
-r base.txt
gunicorn==21.2.0
whitenoise==6.6.0
dj-database-url==2.1.0
django-redis==5.4.0
psycopg2-binary==2.9.9
```

#### d) Create Procfile (for Railway/Heroku)
```
web: gunicorn --chdir src config.wsgi:application
worker: celery -A config worker --loglevel=info
beat: celery -A config beat --loglevel=info
```

### 2. Deploy to Render

#### a) Connect GitHub Repository
1. Go to https://render.com/
2. Sign in with GitHub
3. Click "New" → "Blueprint"
4. Connect your `django-core` repository
5. Render will detect `render.yaml` automatically

#### b) Configure Environment Variables (if not in render.yaml)
In Render Dashboard → Environment:
```
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=(auto-generated or use: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
ALLOWED_HOSTS=django-core-app.onrender.com,your-custom-domain.com
DEBUG=False
```

#### c) Deploy
1. Click "Apply" in Blueprint setup
2. Wait for build (5-10 minutes first time)
3. Render will:
   - Create PostgreSQL database
   - Create Redis instance
   - Build Django app
   - Run migrations automatically (if configured)

### 3. Post-Deployment Setup

#### a) Run Migrations
```bash
# SSH into Render shell (Dashboard → Shell tab)
python src/manage.py migrate
```

#### b) Create Superuser
```bash
python src/manage.py createsuperuser
# Email: admin@yourdomain.com
# Password: (strong password)
```

#### c) Seed Default Roles
```bash
python src/manage.py seed_default_roles
```

#### d) Seed Demo Data (Optional)
```bash
python src/manage.py seed_football_data
```

#### e) Test Endpoints
```bash
# Health check
curl https://django-core-app.onrender.com/health/

# Admin panel
open https://django-core-app.onrender.com/admin/

# API root
curl https://django-core-app.onrender.com/api/v1/
```

### 4. Frontend Deployment (Vercel/Netlify)

#### For Vercel (Recommended for React/Vite)
```bash
cd examples/demo-shell
vercel --prod

# Set environment variables in Vercel dashboard:
VITE_API_BASE_URL=https://django-core-app.onrender.com
```

#### For Netlify
```bash
cd examples/demo-shell
netlify deploy --prod

# netlify.toml
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 5. DNS & Custom Domain (Optional)

#### Add Custom Domain in Render
1. Dashboard → Settings → Custom Domain
2. Add: `app.yourdomain.com`
3. Update DNS records (Render provides CNAME)
4. Wait for SSL certificate (automatic via Let's Encrypt)

#### Update ALLOWED_HOSTS
```python
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[
    ".onrender.com",
    "app.yourdomain.com",
])
```

---

## Required Environment Variables

### Django App
| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key (auto-generate) | `django-insecure-xyz...` |
| `DJANGO_SETTINGS_MODULE` | Settings module | `config.settings.production` |
| `DATABASE_URL` | PostgreSQL connection (auto from Render) | `postgresql://user:pass@host/db` |
| `REDIS_URL` | Redis connection (auto from Render) | `redis://host:6379` |
| `ALLOWED_HOSTS` | Comma-separated domains | `app.onrender.com` |
| `DEBUG` | Debug mode (MUST be False) | `False` |
| `CELERY_BROKER_URL` | Celery broker (same as REDIS_URL) | `redis://host:6379` |

### Frontend (Vite)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `https://django-core-app.onrender.com` |

---

## Health Checks

### Backend Health Endpoint
```bash
curl https://your-app.onrender.com/health/
# Should return: {"status": "ok"}
```

### Database Connection
```bash
# In Render shell:
python src/manage.py dbshell
# Should connect to PostgreSQL
```

### Static Files
```bash
curl https://your-app.onrender.com/static/admin/css/base.css
# Should return CSS (404 = misconfigured STATICFILES)
```

---

## Rollback Plan

### If deployment fails:
1. **Check logs**: Render Dashboard → Logs tab
2. **Revert to last deploy**: Render Dashboard → Deploys → Previous deploy → "Redeploy"
3. **Database backup**: Render auto-backs up daily (free tier: 7 days retention)
4. **Manual backup**: `pg_dump` from Render shell

### Common Issues:
1. **500 errors**: Check `DEBUG=False` + `ALLOWED_HOSTS` set correctly
2. **Static files 404**: Run `collectstatic` in build command
3. **Database connection**: Verify `DATABASE_URL` in environment
4. **CORS errors**: Add frontend domain to `CORS_ALLOWED_ORIGINS`

---

## Monitoring & Maintenance

### Enable Render Monitoring (Free)
- Auto-enabled: uptime monitoring, SSL cert renewal
- Email alerts for downtime

### Add Sentry (Optional - Error Tracking)
```bash
pip install sentry-sdk
```
```python
# settings/production.py
import sentry_sdk
sentry_sdk.init(dsn=env("SENTRY_DSN"))
```

### Database Backups
- **Render Free**: Daily backups (7-day retention)
- **Render Paid**: Daily backups (30-day retention)
- **Manual**: `pg_dump` scheduled via cron/Celery

### Scale Up (When Needed)
1. Upgrade Render plan (Free → Starter $7/mo)
2. Upgrade PostgreSQL (Free → Standard $7/mo for more storage)
3. Add Celery workers (separate service in render.yaml)

---

## Post-Launch Checklist

- [ ] Superuser account created
- [ ] Default roles seeded
- [ ] Demo data (football orgs) seeded
- [ ] Health endpoint responding
- [ ] Admin panel accessible
- [ ] Frontend connected to backend
- [ ] User registration flow tested
- [ ] User login flow tested
- [ ] Organization switching tested
- [ ] Permission boundaries verified
- [ ] Credits/transactions working
- [ ] Notifications delivering
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (auto via Render)
- [ ] Monitoring alerts configured
- [ ] Database backups verified

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Django Deployment**: https://docs.djangoproject.com/en/5.1/howto/deployment/
- **Troubleshooting**: Check `SMOKE_TEST_RESULTS.md` for known issues
- **Security**: Review `docs/security/checklist.md`

---

## Success Criteria

**Deployment is successful when:**
1. ✅ Backend API responds at public URL
2. ✅ Frontend loads and connects to backend
3. ✅ Users can register, login, and access organization
4. ✅ Permissions enforce org/project boundaries
5. ✅ Health check endpoint returns healthy status
6. ✅ No 500 errors in production logs
7. ✅ Static files (admin, CSS) load correctly
8. ✅ Database migrations applied successfully

**Ready to go live!** 🚀
