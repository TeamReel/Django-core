# Management Commands (Contracts)

## seed_demo_data
- **Purpose**: Create demo dataset (5 orgs, 20 users, 80 projects, audit events 200-300, transactions last 30 days, notifications 5-10 unread/account).
- **Flags**:
  - `--verbose`: log progress (counts per entity)
  - `--json`: emit structured JSON summary
- **Behavior**:
  - Idempotent: checks demo org names; skip or upsert without duplicates.
  - Uses seeded randomness (respect `DEMO_RANDOM_SEED`) for timestamp distribution and audit count sampling.
  - Completes <30s; rerun when data exists <5s.
- **Output**: Summary counts; warning if existing data detected.

## reset_demo_data
- **Purpose**: Wipe and recreate demo data.
- **Flags**:
  - `--force`: required to proceed (safety gate)
  - `--json`: emit structured JSON summary
- **Behavior**:
  - Deletes demo-scoped data only; preserves non-demo records (scoped by org names/emails).
  - Runs seed_demo_data after wipe; target <60s total.
- **Output**: Confirmation of wipe + new counts.

## validate_demo_data
- **Purpose**: Verify integrity of demo dataset.
- **Checks**:
  - Each org has ≥1 admin.
  - No negative credit balances; transactions consistent.
  - Projects have valid role assignments; viewers lack write perms.
  - Audit events reference valid orgs/users.
  - Notifications belong to valid users/orgs.
- **Flags**:
  - `--json`: emit structured JSON report
- **Output**: Pass/fail with list of violations (record identifiers).
