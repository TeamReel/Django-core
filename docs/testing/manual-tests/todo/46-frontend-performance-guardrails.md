# Manual Test: B40 Frontend Performance & Fetch Guardrails

**Module:** #046 B40 — Incremental Frontend Performance & Fetch Guardrails
**Status:** ✅ Implementation Complete | 📋 Testing TODO
**Feature Branch:** `046-frontend-performance-guardrails` (merged)
**Test Environment:** Development/Staging

---

## Test Objectives

Verify that the frontend performance guardrails:
1. Track pagination budget per request via FetchBudget
2. Enforce max_pages limit to prevent over-fetching
3. Return X-Fetch-Budget header with budget status
4. Emit warnings when approaching budget limits
5. Can be enabled/disabled via B10 feature flags
6. Log budget events to B18 Observability

---

## Prerequisites

- [ ] Migrations applied (if any)
- [ ] Feature flag configured in B10:
  - [ ] `frontend_fetch_guardrails_enabled`: true
- [ ] Test user with access to paginated endpoints
- [ ] API endpoint with many results (e.g., `/api/v1/projects/` with 100+ items)

---

## Test Scenarios

### 1. FetchBudget Header

#### 1.1 Basic Pagination with Budget Header
- [ ] GET `/api/v1/projects/?page=1`
- [ ] Verify response includes `X-Fetch-Budget` header
- [ ] Parse header JSON:
  ```json
  {
    "total_pages": 10,
    "current_page": 1,
    "max_pages": 5,
    "remaining": 4,
    "usage_percent": 20.0,
    "is_limited": true
  }
  ```

#### 1.2 Progressive Budget Consumption
- [ ] GET page 1, note `remaining: 4`
- [ ] GET page 2, note `remaining: 3`
- [ ] GET page 3, note `remaining: 2`
- [ ] Verify `current_page` increments correctly

---

### 2. Max Pages Limit

#### 2.1 Enforce Page Limit
- [ ] GET `/api/v1/projects/?page=1` (allowed)
- [ ] GET `/api/v1/projects/?page=5` (allowed, at limit)
- [ ] GET `/api/v1/projects/?page=6` (should be blocked or warned)
- [ ] Verify appropriate response:
  - Option A: 400 error with "max pages exceeded"
  - Option B: Returns empty page with warning header
  - Document actual behavior

#### 2.2 Custom Page Size Impact
- [ ] GET `/api/v1/projects/?page=1&page_size=50`
- [ ] Verify budget recalculated based on larger page size
- [ ] Verify total_pages adjusted

---

### 3. Warning Thresholds

#### 3.1 Warning at 80% Budget
- [ ] Fetch pages until `usage_percent >= 80`
- [ ] Check for warning indicator in response:
  - Header: `X-Fetch-Budget-Warning: true`
  - Or body meta: `"budget_warning": true`
- [ ] Verify warning message content

#### 3.2 Critical at 100% Budget
- [ ] Fetch until budget exhausted
- [ ] Verify clear indicator that limit reached
- [ ] Verify next page request behavior

---

### 4. Feature Flag Control

#### 4.1 Guardrails Enabled (Default)
- [ ] Verify feature flag `frontend_fetch_guardrails_enabled: true`
- [ ] Verify budget headers present
- [ ] Verify limits enforced

#### 4.2 Guardrails Disabled
- [ ] Set feature flag to `false`
- [ ] GET paginated endpoint
- [ ] Verify budget headers NOT present (or show unlimited)
- [ ] Verify no page limits enforced

---

### 5. Different Endpoints

#### 5.1 Projects Endpoint
- [ ] GET `/api/v1/projects/`
- [ ] Verify budget tracking works

#### 5.2 Users Endpoint
- [ ] GET `/api/v1/users/`
- [ ] Verify budget tracking works

#### 5.3 Custom Endpoints
- [ ] Test other paginated endpoints
- [ ] Verify consistent budget behavior

---

### 6. Observability Integration (B18)

#### 6.1 Budget Events Logged
- [ ] Make paginated requests
- [ ] Check logs for budget events:
  - `fetch_budget_created`
  - `fetch_budget_warning`
  - `fetch_budget_exceeded`

#### 6.2 Event Details
- [ ] Verify events include:
  - User ID
  - Endpoint
  - Current page
  - Budget stats
  - Timestamp

---

### 7. Edge Cases

#### 7.1 Empty Result Set
- [ ] GET endpoint with no results
- [ ] Verify graceful handling (no errors)
- [ ] Verify budget header still present

#### 7.2 Single Page Result
- [ ] GET endpoint with < page_size results
- [ ] Verify `total_pages: 1`
- [ ] Verify `is_limited: false` (no limit needed)

#### 7.3 Exactly at Limit
- [ ] Result set with exactly max_pages * page_size items
- [ ] Verify boundary handling correct

---

### 8. Frontend Integration

#### 8.1 React Pagination Component
- [ ] Open frontend with paginated list
- [ ] Verify component reads X-Fetch-Budget header
- [ ] Verify UI shows budget status (if implemented)

#### 8.2 Infinite Scroll Behavior
- [ ] If using infinite scroll, verify stops at max pages
- [ ] Verify user feedback when limit reached

---

## API Response Examples

### Success with Budget (Page 1)
```http
GET /api/v1/projects/?page=1
HTTP/1.1 200 OK
X-Fetch-Budget: {"total_pages":10,"current_page":1,"max_pages":5,"remaining":4,"usage_percent":20.0,"is_limited":true}

{
  "status": "success",
  "data": [...],
  "meta": {
    "pagination": {
      "count": 100,
      "page_size": 20,
      "next": "...?page=2"
    }
  }
}
```

### Warning at Threshold
```http
GET /api/v1/projects/?page=4
HTTP/1.1 200 OK
X-Fetch-Budget: {"total_pages":10,"current_page":4,"max_pages":5,"remaining":1,"usage_percent":80.0,"is_limited":true}
X-Fetch-Budget-Warning: Approaching page limit (80% used)
```

### Budget Exceeded
```http
GET /api/v1/projects/?page=6
HTTP/1.1 400 Bad Request

{
  "status": "error",
  "error": {
    "code": "fetch_budget_exceeded",
    "message": "Maximum pages (5) exceeded. Use filters to narrow results."
  }
}
```

---

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| Budget Header | X-Fetch-Budget present on all paginated |
| Page Limit | Enforced at max_pages setting |
| Warnings | Shown at 80% threshold |
| Feature Flag | Can enable/disable guardrails |
| Observability | Events logged to B18 |
| Edge Cases | Graceful handling |

---

## Notes
<!-- Add test execution notes here -->

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
