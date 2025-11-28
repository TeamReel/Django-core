---
work_package_id: "WP05"
subtasks: ["T049", "T050", "T051", "T052", "T053", "T054", "T055", "T056"]
title: "Management Commands & Cleanup"
phase: "Phase 2 - Operations"
lane: "doing"
assignee: ""
agent: "claude-assistant"
shell_pid: "17932"
history:
  - timestamp: "2025-11-28T00:00:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package: WP05 – Management Commands & Cleanup

## Objectives

Create management commands for idempotency key cleanup and test data seeding.

## Commands to Implement

1. **cleanup_idempotency_keys** (`src/transactions/management/commands/cleanup_idempotency_keys.py`)
   - Delete keys older than 7 days (default)
   - Support --retention-days argument
   - Support --dry-run flag
   - Log deleted counts

2. **seed_test_transactions** (`src/transactions/management/commands/seed_test_transactions.py`)
   - Create sample organizations, users, events, transactions
   - Support --count argument for number of records
   - Create realistic test data (various event types, amounts)

## Test Requirements

Test command execution and verify effects (records deleted/created).

## Definition of Done

- [ ] Both commands implemented
- [ ] Command tests pass
- [ ] Commands documented in src/transactions/README.md

Commands to verify:
```bash
python manage.py cleanup_idempotency_keys --dry-run
python manage.py seed_test_transactions --count=100
```

## Activity Log

- 2025-11-28 – system – lane=planned – Prompt created
- 2025-11-28T19:20:24Z – claude-assistant – shell_pid=17932 – lane=doing – Started implementation: Management commands for cleanup and testing
