# B19: Deployment Templates

## 1. Purpose & Responsibility
The **Deployment Templates** provide production-ready Docker and orchestration configurations for deploying the Core-App.

**Responsibilities:**
*   **Containerization:** Multi-stage Dockerfile for optimized images.
*   **Orchestration:** Docker Compose files for Local, Staging, Production.
*   **Process Management:** Procfile for Railway (Web, Beat, Worker).

## 2. Domain-Agnostic Rationale
Deployment should be repeatable and documented. These templates ensure any developer can:
1.  Build a production image.
2.  Deploy to Railway with one command.
3.  Scale horizontally.

## 3. Key Concepts

### 3.1 Dockerfile (`Dockerfile`)
Multi-stage build:
*   **Stage 1 (Builder):** Installs dependencies with build tools.
*   **Stage 2 (Runtime):** Minimal image with only runtime dependencies.

### 3.2 Docker Compose Files
*   **`docker-compose.local.yml`**: Dev environment (SQLite, Redis).
*   **`docker-compose.prod.yml`**: Production (External DB, Gunicorn, Nginx).

### 3.3 Procfile (`Procfile`)
Defines process types for Railway:
```
web: gunicorn config.wsgi:application
beat: celery -A config beat
```

## 4. Railway Integration

### 4.1 Configuration (`railway.json`)
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": { "numReplicas": 1 }
}
```

### 4.2 Environment Variables
Railway injects:
*   `DATABASE_URL` (PostgreSQL connection string).
*   `REDIS_URL` (Redis connection string).
*   `PORT` (Assigned by Railway).

### 4.3 Multiple Services
The Core-App runs **3 separate Railway services**:
1.  **Web** (`web` process): Django/Gunicorn.
2.  **Beat** (`beat` process): Celery scheduler.
3.  **Worker** (optional): Celery async tasks.

## 5. Status & Phase History
*   **Phase:** 5 (Operationalisation)
*   **Status:** ✅ Complete & Production-Deployed
*   **Source Code:** `Dockerfile`, `docker-compose.*.yml`, `Procfile`, `railway.json`
