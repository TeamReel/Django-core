# Railway Procfile for Django Core-App
# This defines multiple process types for the application
#
# NOTE: Railway does NOT automatically run all processes from a Procfile.
# You must create separate services in Railway Dashboard for each process type.
# See docs/railway/RAILWAY_SETUP.md section 6 for instructions.

# Web server (Gunicorn with production settings)
# This is the default process type that Railway runs automatically.
# IMPORTANT: ensure migrations run in production so new DB columns exist.
web: python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120

# Celery Beat scheduler (metrics collection every 10 minutes)
# SETUP REQUIRED: Create a separate Railway service with custom start command
# Command: celery -A config beat --loglevel=info
beat: celery -A config beat --loglevel=info

# Celery Worker (for async tasks including B31 content generation)
# SETUP REQUIRED: Create a separate Railway service for async task processing
# Command: celery -A config worker --loglevel=info --concurrency=2
worker: celery -A config worker --loglevel=info --concurrency=2
