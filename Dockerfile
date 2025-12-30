# Multi-stage Dockerfile for Django Core-App
# B19 Deployment Templates & Configuration
#
# Stage 1: Builder - Installs dependencies with build tools
# Stage 2: Production - Minimal runtime with compiled packages

# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM python:3.12 AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements/production.txt /tmp/requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r /tmp/requirements.txt

# =============================================================================
# Stage 2: Production Runtime
# =============================================================================
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/app/src" \
    DJANGO_SETTINGS_MODULE=config.settings.production

# Install runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security (B03 alignment)
RUN groupadd -r django && useradd -r -g django -u 1000 django

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=django:django . /app

# Switch to non-root user (before collectstatic for proper ownership)
USER django

# Collect static files (served by Nginx in production)
RUN python manage.py collectstatic --noinput --clear

# Expose port for Gunicorn (Railway sets PORT dynamically)
EXPOSE 8080

# Health check using B18 endpoints
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8080}/health/')" || exit 1

# Default command: Run Gunicorn via Python startup script
CMD ["python", "/app/scripts/start.py"]
