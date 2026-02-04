# TeamReel Transactions, Balances & Wallets Plan

**Last Updated:** 2026-01-15
**Environment:** Railway Production (backend) + TeamReel webapp (frontend)
**Status:** Active (implemented + demo-hardening)
**Related Docs:**
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Hierarchy + guiding principles
- [TeamReel RBAC Configuration](teamreel-rbac-config.md) - Who can view/manage credits
- [TeamReel Seeding Plan](teamreel-seeding-plan.md) - General TeamReel seeding approach
- [TeamReel Frontend Integration Audit](teamreel-frontend-integration-audit.md) - What’s wired in the UI

---

## 📋 Executive Summary

**What this covers:** how credits are modeled, queried, and routed in TeamReel.

**Core design:**
- **Immutable ledger** (`Transaction`) + attribution (`UsageEvent`).
- **Three wallet scopes**: user, project (team/club), organization.
- **Routing strategy** for debits is configurable per org via B10 settings (`transactions_payer_routing_default`).

**TeamReel demo UX goals:**
- Team detail shows **Balance** + **Transactions** using real APIs.
- Logged-in user sees **“Your Credits Balance”** (user wallet within org).

---

## 🎯 Goal

TeamReel needs **realistic, non-empty** credits data across core pages:
- Team detail shows **Balance** + **Transactions** with real API calls.
- Logged-in user sees **“Your Credits Balance”** (user wallet).
- Debits can be routed in a production-friendly way (fallback strategy), without hardcoding logic in the frontend.

Non-goals:
- No destructive DB ops (no flush/drop).
- No mock data in frontend.

---

## 🧠 Current Implementation Snapshot

TeamReel uses an **immutable ledger** (`Transaction`) and event attribution (`UsageEvent`). Balances are computed as aggregates over transactions.

### 1) Wallet scopes (how a Transaction maps to a wallet)
A `Transaction` represents a movement of credits.
- **Positive amount** = top-up / credit added
- **Negative amount** = debit / credit used

Each transaction belongs to exactly one wallet scope:
- **User wallet**: `wallet_scope = user` and `charged_user != NULL`
- **Project wallet (team/club)**: `wallet_scope = project` and `project != NULL`
- **Organization wallet (federation/league)**: `wallet_scope = organization` and `project = NULL` and `charged_user = NULL`

Important TeamReel nuance:
- When a debit falls back to the **organization** wallet, the resulting transaction is intentionally **org-scoped** (`project=NULL`). Context (which team initiated it) is retained via `UsageEvent` and `notes`.

### 2) Usage events vs adjustments
`source_type` distinguishes why a transaction exists.
- `usage_event`: debit is tied to a `UsageEvent` (required by DB constraint)
- `adjustment` / `external_billing`: admin/system topups, imports, etc.

For `source_type=usage_event`, `usage_event_id` must be present.

### 3) Idempotency
Transaction creation is protected via `idempotency_key`.
- Re-running seeders safely results in `↻ exists ...` rather than duplicates.

---

## 🔢 Balances (How they’re computed)

Balances are computed by aggregating transactions:
- organization balance: sum of org-scoped transactions
- project balance: sum of project-scoped transactions for a project
- user balance: sum of user-scoped transactions for a user within an organization

Implementation uses service-layer functions with caching and invalidation:
- `get_organization_balance(organization_id)`
- `get_project_balance(project_id)`
- `get_user_balance(organization_id, user_id)`

Caching:
- Cached per-scope (Redis), with invalidation triggered when relevant transactions are created.

---

## 🌐 API Endpoints (Used by TeamReel UI)

All endpoints live under `/api/v1/transactions/`.

### Balance endpoints
- Organization balance:
  - `GET /api/v1/transactions/organizations/<org_uuid>/balance/`
- Authenticated user’s balance (within an org):
  - `GET /api/v1/transactions/organizations/<org_uuid>/balance/me/`
- Project/team balance:
  - `GET /api/v1/transactions/projects/<project_id>/balance/`

### Transaction listing / creation
- Transactions:
  - `GET /api/v1/transactions/transactions/`
  - `POST /api/v1/transactions/transactions/`

Key filters supported in the API layer include `organization_id`, `project_id`, and `charged_user_id`.

---

## 🔁 Payer routing (Fallback strategy)

TeamReel supports “who pays” routing for debits.

### Why
In the TeamReel scenario, a debit should be able to fall back when a wallet has insufficient balance:
- Example: user wallet empty → team wallet pays → federation wallet pays

### Strategy
Routing strategy can be configured per organization (B10 Settings), using the key:
- `transactions_payer_routing_default`

Allowed values:
- `explicit` (no fallback; caller must choose wallet explicitly)
- `user_project_org` (user → team(project) → organisation)
- `project_user_org` (team(project) → user → organisation)

Operationally, this is set via the management command:
- `python manage.py set_transactions_payer_routing --org knvb --value user_project_org`

---

## 🛡️ Governance baseline (BalancePolicy)

Naast *payer routing* gebruikt TeamReel een expliciete **BalancePolicy** per organisatie als veiligheidsgordel:

- **Wat het doet:** bepaalt of negatieve saldi zijn toegestaan en hoe streng we handhaven.
- **Waarom:** payer routing bepaalt *wie betaalt*; BalancePolicy bepaalt *of* en *hoe* een “onder nul” scenario wordt toegestaan/geb lokkeerd.

**Defaults (TeamReel strategy):**
- org-level policy (`project = NULL`)
- `allow_negative = False`
- `enforcement_mode = BLOCK`
- `warn_threshold = 100.0000`

**Operationally (Railway-safe):**
- Preview (no writes): `python manage.py seed_teamreel_governance`
- Apply: `python manage.py seed_teamreel_governance --execute`

Note: dit seed-commando is idempotent en vult alleen ontbrekende governance defaults.

---

## 🧪 Demo seeding & verification (Railway-safe)

### 1) “User wallet burn” volume seeding
To make usage non-empty in the UI, seed user-wallet debits:
- `python manage.py seed_user_credit_burn --org knvb --user admin@teamreel.demo`

### 2) Minimal routing smoke verification (deterministic)
To verify routing and org fallback deterministically:
- `python manage.py seed_transactions_routing_smoke --settings=config.settings.production --org knvb`

Optional reproducibility:
- `--team-id <project_id>` to target a specific team

This command prints a “wallet_scope per idempotency key” table that re-fetches transactions by `idempotency_key`, so repeat runs still verify behavior even if rows already exist.

---

## ✅ TeamReel demo readiness checklist (Transactions/Credits)

- Team detail page shows:
  - Team balance via `GET /api/v1/transactions/projects/<project_id>/balance/`
  - Transactions list via `GET /api/v1/transactions/transactions/?project_id=<project_id>`
- Logged-in user page/tab shows:
  - “Your Credits Balance” via `GET /api/v1/transactions/organizations/<org_uuid>/balance/me/`
- Org routing for `knvb` is set (B10 setting) to demonstrate fallback.
- Seeded data exists (no empty state) and is idempotent.

---

## 📌 Design Decisions (TeamReel-specific)

| Vraag | Beslissing | Rationale |
|---|---|---|
| **1. Wallet scopes** | **User + Project + Organisation wallets** | Demo needs realistic flows: personal usage + team budgets + federation fallback. |
| **2. Org fallback representation** | **Org fallback debits are org-scoped (`project=NULL`)** | Keeps ledger semantics clean; team context stays in `UsageEvent`/`notes`.
| **3. Routing config storage** | **Per-org via B10 Settings (`transactions_payer_routing_default`)** | Production-friendly defaults without hardcoding per org in code.

---

## 📌 Notes

- **User wallet exists** and is first-class for demo UX (“your balance”).
- **Organization fallback debits are org-scoped** (`project=NULL`). Team context remains visible via `UsageEvent` and `notes`.
- Routing config is stored in B10 settings (production-friendly), not hardcoded per org in code.
