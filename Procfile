# Railway Procfile for Django Core-App
# This defines multiple process types for the application
#
# NOTE: Railway does NOT automatically run all processes from a Procfile.
# You must create separate services in Railway Dashboard for each process type.
# See docs/railway/RAILWAY_SETUP.md section 6 for instructions.

# Web server (Gunicorn with production settings)
# This is the default process type that Railway runs automatically.
# IMPORTANT: ensure migrations run in production so new DB columns exist.
web: python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 300

# Celery Beat scheduler (metrics collection every 10 minutes)
# SETUP REQUIRED: Create a separate Railway service with custom start command
# Command: celery -A config beat --loglevel=info
beat: celery -A config beat --loglevel=info

# ─── Celery Workers (3 separate Railway services) ───────────────────
# Each worker handles a different queue tier to prevent blocking.
# Create a separate Railway service for EACH worker type.

# Worker 1: Fast/default tasks (thumbnails, auto-crop, quick operations)
# Concurrency=2: handles multiple lightweight tasks in parallel
# Command: celery -A config worker --loglevel=info --concurrency=2 -Q default,video_fast -n worker-fast@%h
worker: celery -A config worker --loglevel=info --concurrency=2 -Q default,video_fast -n worker-fast@%h

# Worker 2: Heavy video processing (RVM background removal, transcoding, composition)
# Concurrency=1: these are CPU/memory-intensive, one at a time
# Command: celery -A config worker --loglevel=info --concurrency=1 -Q video_slow -n worker-video@%h
worker-video: celery -A config worker --loglevel=info --concurrency=1 -Q video_slow -n worker-video@%h

# Worker 3: AI generation (Gemini/MiniMax/Veo API calls)
# Concurrency=1: rate-limited, sequential to prevent API overload
# Command: celery -A config worker --loglevel=info --concurrency=1 -Q ai_generation -n worker-ai@%h
worker-ai: celery -A config worker --loglevel=info --concurrency=1 -Q ai_generation -n worker-ai@%h
