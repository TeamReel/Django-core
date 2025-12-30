#!/bin/sh
set -e

echo "Starting entrypoint script..."
echo "PORT is set to: ${PORT:-8000}"

# Start Gunicorn
# We use exec to ensure gunicorn receives signals (like SIGTERM)
echo "Starting Gunicorn on 0.0.0.0:${PORT:-8000}..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 4 \
    --worker-class sync \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --timeout 30 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
