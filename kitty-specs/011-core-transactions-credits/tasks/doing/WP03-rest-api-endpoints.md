---
work_package_id: "WP03"
subtasks: ["T024", "T025", "T026", "T027", "T028", "T029", "T030", "T031", "T032", "T033", "T034", "T035", "T036", "T037", "T038", "T039"]
title: "REST API Endpoints"
phase: "Phase 1 - API Layer"
lane: "doing"
assignee: ""
agent: "system"
history:
  - timestamp: "2025-11-28T00:00:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package: WP03 – REST API Endpoints

## Objectives

Implement DRF API with 8 endpoints: UsageEvent create/list, Transaction create/list (with CSV export), Balance queries (org/project), BalancePolicy get/update.

## Key Implementation Files

- `src/transactions/api/serializers.py`: UsageEventSerializer, TransactionSerializer, BalanceSerializer, BalancePolicySerializer
- `src/transactions/api/views.py`: ViewSets for all endpoints
- `src/transactions/api/filters.py`: django-filter classes
- `src/transactions/api/urls.py`: Router configuration with /api/v1/ prefix

## Critical Requirements

1. **CSV Export**: TransactionViewSet must support `?format=csv` query param
2. **Permissions**: All endpoints check org/project access via B08 permissions
3. **Error Responses**: 403 for policy violations with structured JSON (current_balance, requested_amount, policy)
4. **Pagination**: Default 50 items, DRF cursor pagination
5. **Validation**: DecimalField validation (14 digits, 4 decimals), idempotency_key required for transactions

## API Contract Reference

See `contracts/transactions-api.yaml` for full OpenAPI spec with request/response schemas.

## Test Requirements

- API tests for all endpoints (success cases)
- Validation error tests (400 responses)
- Policy enforcement tests (403 responses)
- CSV export test (verify format)
- Multi-tenant isolation tests (403 for cross-org access)

## Dependencies

WP02 (service layer must exist)

## Definition of Done

- [ ] All 8 endpoints implemented
- [ ] API tests pass with 90%+ coverage
- [ ] CSV export works correctly
- [ ] Permissions enforced (multi-tenant isolation)
- [ ] OpenAPI schema validates

Commands:
```bash
pytest transactions/tests/test_api.py -v
```

## Activity Log

- 2025-11-28 – system – lane=planned – Prompt created
- 2025-11-28T18:15:52Z – system – shell_pid= – lane=doing – Moved to doing
