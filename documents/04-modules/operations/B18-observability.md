# B18: Observability

## 1. Purpose & Responsibility
The **Observability** module provides visibility into the running system through health checks, metrics, and logging.

**Responsibilities:**
*   **Health Checks:** `/health/live` and `/health/ready` endpoints.
*   **Metrics Collection:** Prometheus-compatible metrics.
*   **Logging Infrastructure:** Structured logging to stdout/files.

## 2. Domain-Agnostic Rationale
"You can't fix what you can't see." Observability is non-negotiable for production systems. This module standardizes:
*   **Health:** Kubernetes liveness/readiness probes.
*   **Metrics:** Request counts, latencies, errors.
*   **Logs:** Structured JSON for aggregation (ELK, Datadog).

## 3. Key Concepts

### 3.1 Health Checks (`src/observability/health.py`)
*   **`/health/live`**: Is the app running? (Always returns 200 unless crashed).
*   **`/health/ready`**: Can the app serve traffic? (Checks DB, Redis).

### 3.2 Metrics (`src/observability/metrics.py`)
Prometheus counters/gauges:
*   `http_requests_total`
*   `audit_events_recorded_total`
*   `cache_hit_rate`

### 3.3 Middleware (`src/observability/middleware.py`)
Intercepts requests to record timing and errors.

## 4. Public Interfaces (Endpoints)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health/live` | Liveness probe. |
| `GET` | `/health/ready` | Readiness probe. |
| `GET` | `/metrics/` | Prometheus scrape target. |

## 5. Integrations & Dependencies
*   **Prometheus:** Scrapes `/metrics/`.
*   **Railway/Kubernetes:** Consumes health check endpoints.

## 6. Status & Phase History
*   **Phase:** 5 (Operationalisation)
*   **Status:** ✅ Complete
*   **Source Code:** `src/observability/`
