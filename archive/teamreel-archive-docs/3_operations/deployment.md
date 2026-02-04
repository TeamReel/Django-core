# 🚀 TeamReel Railway Deployment Guide

## Overview
Complete guide for deploying TeamReel Django backend to Railway with PostgreSQL database.

## 🏗️ Architecture

### Technology Stack
- **Backend**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL (Railway managed)
- **WSGI Server**: Gunicorn
- **Static Files**: WhiteNoise
- **Platform**: Railway PaaS

### Railway Configuration
- **Builder**: Nixpacks (auto-detects Python)
- **Python Version**: 3.11
- **Start Command**: Gunicorn with migrations
- **Environment**: Production-ready settings

## 🚀 Quick Deploy

### Prerequisites
1. Railway account: [railway.app](https://railway.app)
2. Railway CLI installed: `npm install -g @railway/cli`
3. Git repository connected to Railway

### One-Click Deploy
```bash
# 1. Login to Railway
railway login

# 2. Create new project (first time only)
railway new teamreel-backend

# 3. Add PostgreSQL database
railway add --database postgresql

# 4. Deploy
railway up
```

## ⚙️ Configuration Details

### Environment Variables
Add these to Railway project settings:

#### Required Variables
```bash
# Django Settings
SECRET_KEY="your-secret-key-here"
DEBUG="False"
DJANGO_SETTINGS_MODULE="teamreel.settings"

# Database (Auto-configured by Railway)
DATABASE_URL="postgresql://user:pass@host:port/db"

# Security
ALLOWED_HOSTS="your-domain.railway.app,localhost"
```

#### Optional Variables
```bash
# CORS (for frontend integration)
CORS_ALLOWED_ORIGINS="https://your-frontend.vercel.app"

# Email (for notifications)
EMAIL_HOST="smtp.gmail.com"
EMAIL_HOST_USER="your-email@gmail.com"
EMAIL_HOST_PASSWORD="your-app-password"

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_STORAGE_BUCKET_NAME="teamreel-uploads"
```

### Railway Configuration Files

#### `/railway.json` (Root Level)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && pip install -r requirements.txt && python manage.py collectstatic --noinput"
  },
  "deploy": {
    "startCommand": "cd backend && python manage.py migrate && gunicorn teamreel.wsgi:application --bind 0.0.0.0:$PORT",
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

#### `/backend/railway.toml` (Backend Specific)
```toml
[build]
builder = "NIXPACKS"

[build.env]
NIXPACKS_PYTHON_VERSION = "3.11"

[deploy]
startCommand = "python manage.py migrate && gunicorn teamreel.wsgi:application --bind 0.0.0.0:$PORT"

[env]
DEBUG = "False"
DJANGO_SETTINGS_MODULE = "teamreel.settings"
```

#### `/Procfile` (Process Definition)
```
web: cd backend && gunicorn teamreel.wsgi:application --bind 0.0.0.0:$PORT
worker: cd backend && python manage.py runworker
```

## 🗄️ Database Setup

### PostgreSQL Configuration
Railway automatically provides PostgreSQL with these benefits:
- Automatic backups
- Connection pooling
- SSL encryption
- Monitoring dashboard

### Database Connection
```python
# settings.py (already configured)
import dj_database_url

DATABASES = {
    'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
}
```

### Running Migrations
```bash
# Automatic on deployment
railway up

# Manual migration
railway run python manage.py migrate

# Create superuser
railway run python manage.py createsuperuser
```

## 🧪 Testing & Validation

### Health Check Endpoint
Test your deployment:
```bash
curl https://your-app.railway.app/api/health/
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-07T12:00:00Z",
  "version": "1.0.0",
  "environment": "production",
  "database": "postgresql",
  "message": "TeamReel backend is running successfully"
}
```

### API Root Endpoint
```bash
curl https://your-app.railway.app/api/
```

### Admin Interface
Access Django admin at:
```
https://your-app.railway.app/admin/
```

### Automated Testing
Run the deployment test script:
```bash
cd backend
python test_railway_deployment.py
```

## 🔧 Development Workflow

### Local Development
```bash
# 1. Setup virtual environment
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup local database
python manage.py migrate

# 4. Create superuser
python manage.py createsuperuser

# 5. Run development server
python manage.py runserver
```

### Deploy Updates
```bash
# 1. Commit changes
git add .
git commit -m "feat: update backend functionality"

# 2. Push to main branch
git push origin main

# 3. Deploy to Railway
railway up

# 4. Check deployment
railway logs
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
railway logs --service backend

# Common fixes:
# 1. Update requirements.txt
# 2. Check Python version compatibility
# 3. Verify railway.json syntax
```

#### Database Connection Issues
```bash
# Check database status
railway status

# View database logs
railway logs --service postgresql

# Reset database (careful!)
railway restart --service postgresql
```

#### Static Files Issues
```bash
# Collect static files manually
railway run python manage.py collectstatic --noinput

# Check WhiteNoise configuration in settings.py
# Verify STATIC_ROOT and STATIC_URL settings
```

#### Environment Variables
```bash
# List all variables
railway variables

# Set new variable
railway variables set SECRET_KEY="new-secret-key"

# Remove variable
railway variables remove OLD_VARIABLE
```

### Performance Monitoring
```bash
# View resource usage
railway metrics

# Check application logs
railway logs --tail

# Monitor database performance
railway db status
```

## 🔐 Security Checklist

### Production Security
- [ ] `DEBUG = False` in production
- [ ] Strong `SECRET_KEY` (50+ characters)
- [ ] HTTPS enabled (automatic on Railway)
- [ ] Database SSL enabled (automatic)
- [ ] CORS configured for frontend domains only
- [ ] Admin interface secured with strong passwords
- [ ] Regular dependency updates

### Environment Variables Security
- [ ] No secrets in code repository
- [ ] Use Railway's encrypted variables
- [ ] Rotate keys regularly
- [ ] Separate dev/prod environments

## 📊 Monitoring & Maintenance

### Railway Dashboard
Monitor your deployment:
- Resource usage (CPU, Memory, Network)
- Application logs and errors
- Database performance metrics
- Deployment history

### Log Analysis
```bash
# Real-time logs
railway logs --tail

# Filter by service
railway logs --service backend

# Export logs for analysis
railway logs --json > deployment.log
```

### Backup Strategy
- Database: Automatic daily backups by Railway
- Code: Git repository with tagged releases
- Environment: Document all variables in team vault

## 🚀 Next Steps

After successful deployment:

1. **Frontend Integration**
   - Update CORS settings for frontend domain
   - Configure API base URL in frontend app

2. **Custom Domain**
   - Add custom domain in Railway dashboard
   - Update ALLOWED_HOSTS in Django settings

3. **CI/CD Pipeline**
   - Setup GitHub Actions for automated deployment
   - Add deployment tests and health checks

4. **Monitoring**
   - Setup error tracking (Sentry)
   - Configure uptime monitoring
   - Add performance monitoring

---
*Railway Deployment Guide v1.0 - TeamReel Backend*
*Last updated: 2025-11-07*
