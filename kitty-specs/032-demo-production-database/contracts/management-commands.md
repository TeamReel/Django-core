# Management Commands (Contracts)

## seed_demo_data
- **Purpose**: Create demo dataset (5 orgs, 20 users, 80 projects, audit events 200-300, transactions last 30 days, notifications 5-10 unread/account).
- **Flags**:
  - `--verbose`: Log detailed progress (counts per entity)
  - `--json`: Emit structured JSON summary
  - `--force`: Force recreation even if data exists (WARNING: deletes existing demo data)
- **Behavior**:
  - Idempotent: Checks demo org names; skips if data exists (unless --force)
  - Uses seeded randomness (respects `DEMO_RANDOM_SEED` env var) for timestamp distribution and audit count sampling
  - Completes <30s initial; rerun when data exists <5s
- **Output Formats**:
  - **Console (default)**: Human-readable summary with entity counts and elapsed time
  - **JSON (--json)**: Structured output with status, counts, and timing
- **Exit Codes**:
  - 0: Success (data seeded or already exists)
  - 1: Error during seeding

**Sample JSON Output**:
```json
{
  "status": "success",
  "organisations": 5,
  "superusers": 3,
  "org_admins": 10,
  "members_viewers": 7,
  "demo_accounts": 6,
  "users_additional": 14,
  "projects": 80,
  "audit_events_count": 250,
  "transactions_count": 150,
  "notifications_count": 200,
  "feature_flags_count": 15,
  "elapsed_seconds": 12.5
}
```

## reset_demo_data
- **Purpose**: Wipe and recreate demo data.
- **Flags**:
  - `--force`: Required to proceed (safety gate) - command fails without this flag
  - `--no-seed`: Skip reseeding after wipe (only delete data)
  - `--json`: Emit structured JSON summary
  - `--verbose`: Show detailed progress messages
- **Behavior**:
  - Deletes demo-scoped data only; preserves non-demo records (scoped by org slugs/emails)
  - Runs seed_demo_data after wipe (unless --no-seed); target <60s total
  - Two-phase operation: wipe phase (2-3s) + seed phase (12-15s)
- **Output Formats**:
  - **Console (default)**: Human-readable wipe/seed summary
  - **JSON (--json)**: Structured output with wipe/seed details and timing
- **Exit Codes**:
  - 0: Success (data wiped and optionally reseeded)
  - 1: Error (missing --force flag or operation failure)

**Sample JSON Output**:
```json
{
  "status": "success",
  "wipe": {
    "deleted": {
      "projects": 80,
      "memberships": 20,
      "users": 20,
      "organisations": 5,
      "audit_events": 250,
      "transactions": 150,
      "notifications": 200
    },
    "elapsed_seconds": 2.3
  },
  "seed": {
    "skipped": false,
    "elapsed_seconds": 12.1
  },
  "total_elapsed_seconds": 14.4
}
```

## validate_demo_data
- **Purpose**: Verify integrity of demo dataset.
- **Checks**:
  - Each org has ≥1 admin
  - No negative credit balances; transactions consistent
  - Projects have valid role assignments; viewers lack write perms
  - Audit events reference valid orgs/users
  - Notifications belong to valid users/orgs
- **Flags**:
  - `--json`: Emit structured JSON report
- **Behavior**:
  - Runs 5 validation checks against database
  - Calculates database size (PostgreSQL only)
  - Reports violations with specific details (record identifiers, messages)
  - Completes <1s typically
- **Output Formats**:
  - **Console (default)**: Pass/fail with violation list
  - **JSON (--json)**: Structured report with violations array
- **Exit Codes**:
  - 0: Validation passed (0 violations)
  - 1: Validation failed (1+ violations)

**Sample JSON Output (Pass)**:
```json
{
  "status": "pass",
  "violations_count": 0,
  "violations": [],
  "elapsed_seconds": 0.8,
  "db_size_mb": 52
}
```

**Sample JSON Output (Fail)**:
```json
{
  "status": "fail",
  "violations_count": 2,
  "violations": [
    {
      "check": "org_admins",
      "message": "Organisation 'TechCorp' has no admins"
    },
    {
      "check": "credit_balances",
      "message": "Organisation 'StartupLabs' has negative balance: -500"
    }
  ],
  "elapsed_seconds": 1.2,
  "db_size_mb": 52
}
```
