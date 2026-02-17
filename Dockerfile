# Multi-stage Dockerfile for Django Core-App
# B19 Deployment Templates & Configuration
#
# Stage 1: Builder - Installs dependencies with build tools
# Stage 2: Production - Minimal runtime with compiled packages

# =============================================================================
# Stage 1: Builder
# =============================================================================
# Use AWS Public ECR mirror of official Docker Library images to reduce
# susceptibility to Docker Hub auth/token outages and anonymous rate limits.
FROM public.ecr.aws/docker/library/python:3.12 AS builder

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
FROM public.ecr.aws/docker/library/python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/app/src" \
    NUMBA_CACHE_DIR="/tmp/numba_cache" \
    DJANGO_SETTINGS_MODULE=config.settings.production

# Install runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgomp1 \
    curl \
    xz-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install a known-good FFmpeg bundle.
# NOTE: Debian apt FFmpeg frequently cannot encode VP9 alpha (yuva420p).
# We use BtbN's Linux x86_64 GPL builds and keep them in /usr/local/ffmpeg so
# any bundled libs can be resolved via $ORIGIN.
# GPL (not LGPL) is needed because the LGPL build silently drops VP9 alpha
# planes — the encode succeeds but outputs yuv420p instead of yuva420p.
RUN mkdir -p /usr/local/ffmpeg \
    && curl -sSL -o /tmp/ffmpeg.tar.xz \
        https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n7.1-latest-linux64-gpl-7.1.tar.xz \
    && tar -xJf /tmp/ffmpeg.tar.xz -C /usr/local/ffmpeg --strip-components=1 \
    && rm -f /tmp/ffmpeg.tar.xz \
    && /usr/local/ffmpeg/bin/ffmpeg -version | head -1 \
    && /usr/local/ffmpeg/bin/ffprobe -version | head -1

# Create non-root user for security (B03 alignment)
# -m creates a home dir (needed by rembg/pooch to cache U2-Net model in ~/.u2net)
RUN groupadd -r django && useradd -r -g django -u 1000 -m django

# Numba (used by pymatting/rembg) tries to write JIT caches next to source files.
# In production the venv is not writable for the non-root user, so we provide
# an explicit writable cache dir.
RUN mkdir -p /tmp/numba_cache && chown -R django:django /tmp/numba_cache

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

# Health check using Railway's /health/ endpoint
# Note: Railway overrides this with its own healthcheck configuration
# This is kept for local Docker deployments
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\", \"8080\")}/health/')" || exit 1

# Default command: Run Gunicorn via Python startup script
CMD ["sh", "-c", "python /app/scripts/start.py"]
