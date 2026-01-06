# Observability Page - Backend Wiring Summary

**Date**: December 26, 2025
**Type**: Manual Core Validation (demo-first)
**Scope**: Replace mock observability data with real backend connection

---

## Changes Made

### Backend (Step 2 - Minimal JSON Endpoint)

**Created**: `src/observability/views.py`
- Minimal JSON summary endpoint: `GET /api/observability/metrics/`
- Safely extracts metrics from Prometheus REGISTRY
- Returns 200 with nulls when metrics unavailable (no 500 errors)
- Response includes `available: false` when no real data exists

**Created**: `src/observability/urls.py`
- Routes `/metrics/` to `metrics_summary` view

**Modified**: `src/config/urls.py`
- Added `path("api/observability/", include("observability.urls"))`
- Positioned after audit and before prometheus `/metrics` endpoint

### Frontend (Step 3 & 4 - Remove Mock, Add Real States)

**Modified**: `examples/demo-shell/src/pages/platform/ObservabilityPage.tsx`

**Removed**:
- All mock/simulated metric generation (no more `Math.random()`)
- "Demo Mode" alert banner claiming simulated updates
- 404 fallback to mock data

**Added**:
- Real API fetch to `${apiBaseUrl}/api/observability/metrics/`
- **Loading state**: Shows spinner on initial load
- **Error state**: "Observability data unavailable (backend error)" + Retry button
- **Empty state**: "No observability metrics configured yet" when `available: false`
- **Data state**: Shows metrics only when `available: true` and values exist

**Fixed**:
- Replaced all Tailwind CSS classes (`className="..."`) with inline styles for consistency
- Proper null-checking: `backendMetrics.value != null` before rendering
- Polling interval: 30 seconds (sane, not per-second spam)
- Charts only render when `metricsHistory.length > 0`

---

## Current Behavior

### Backend Running
**Endpoint**: `http://localhost:8000/api/observability/metrics/`

**Response** (current state):
```json
{
  "timestamp": null,
  "requests_total": null,
  "response_time_p99": null,
  "response_time_p95": null,
  "response_time_median": null,
  "error_rate_4xx": null,
  "error_rate_5xx": null,
  "active_connections": null,
  "database_latency": null,
  "cache_hit_ratio": null,
  "message": "Minimal observability metrics available. Some metrics require custom instrumentation.",
  "available": false
}
```

**UI State**: Shows **empty state** with message:
> "No observability metrics configured yet. Minimal observability metrics available. Some metrics require custom instrumentation."

### Backend Stopped
**UI State**: Shows **error state** with message:
> "Observability data unavailable (backend error): Failed to fetch..."

---

## Manual Verification Checklist

✅ **Endpoint exists and returns 200**:
```bash
python -c "import requests; print(requests.get('http://localhost:8000/api/observability/metrics/').status_code)"
# Expected: 200
```

✅ **Frontend fetches from backend**:
- Open `/observability` in demo shell
- Check Network tab: 1 request to `/api/observability/metrics/`
- No 404s, no CORS errors

✅ **Empty state renders correctly**:
- Page shows "No observability metrics configured yet" message
- No N/A cards or empty charts displayed

✅ **Error state works**:
- Stop Django backend
- Page shows error + Retry button
- Click Retry → refetches when backend restarts

✅ **Polling is sane**:
- Network tab shows requests every ~30 seconds
- Not per-second spam

✅ **Theme switching**:
- Toggle dark/light mode
- No visual regressions

---

## Next Steps (Future Work - Out of Scope for Current Validation)

To populate real metrics, one would need to:

1. **Instrument middleware**: Track request counts, latencies, status codes
2. **Use django-prometheus metrics**: Extract from `django_http_*` metrics already collected
3. **Add custom gauges**: For active connections, DB latency, cache hit ratio
4. **Update `_safe_get_metric_value()`**: To correctly parse histogram quantiles (p95, p99)

**NOT REQUIRED NOW** — the page is stable and correctly shows "unavailable" state.

---

## Definition of Done ✅

- [x] Backend endpoint exists and returns JSON (no 500 errors)
- [x] Frontend fetches real data (no mock fallback)
- [x] Empty state displayed when `available: false`
- [x] Error state displayed on fetch failure
- [x] Polling interval is 30 seconds (sane)
- [x] No Tailwind CSS classes remain (all inline styles)
- [x] Page works in both light and dark mode
- [x] No console errors on load

**Status**: Ready for manual validation walkthrough.
