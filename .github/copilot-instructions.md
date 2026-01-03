## Current Mode: Demo Finalization & Verification (Go-Live Track)

We are currently in the **DEMO FINALIZATION** phase.
**Goal:** Ensure the production demo (Railway) is fully populated, stable, and visually correct for all core pages.

**Project Context:**
- **System:** Django Core-App (SaaS Boilerplate).
- **Architecture:** Django REST Framework (Backend) + React/Vite (Frontend).
- **Demo Scenario:** "Football Leagues" (Organisations = Leagues, Projects = Teams/Seasons).
- **Key Capabilities:** Auth, RBAC, Audit Logging, Transactions/Credits, Notifications.

**Infrastructure & Deployment:**
- **Backend:** Deployed on **Railway** (Service: `backend`).
- **Database:** PostgreSQL (Railway Plugin).
- **Cache:** Redis (Railway Plugin).
- **Frontend:** Deployed on Vercel/Netlify (consumes Backend API).
- **Management Commands:** User does NOT have access to Railway Shell. All commands must be run locally using the `DATABASE_URL` environment variable pointing to the Railway Public URL.
- **Reference Docs:**
    - `docs/railway/RAILWAY_SETUP.md`: Deployment variables and troubleshooting.
    - `docs/demo/DEMO_DB_STATUS.md`: Current data population status.

**What "Done" Means:**
- All core pages (Dashboard, Usage Events, Health, Projects, etc.) render with realistic data.
- No "Empty State" placeholders unless intentionally designed.
- System Health page shows "Green" status with real backend checks.
- `docs/demo/DEMO_DB_STATUS.md` shows "READY" for all critical models.

**Workflow:**
1.  **Check Status:** Consult `docs/demo/DEMO_DB_STATUS.md` to see which models are empty.
2.  **Verify UI:** Check the corresponding frontend page (e.g., `/usage-events`).
3.  **Populate:** If empty, create/run a specific seeder (e.g., `seed_usage_events`).
4.  **Validate:** Verify the page renders correctly with the new data.

**Source of Truth Hierarchy:**
1.  `docs/demo/DEMO_DB_STATUS.md` (Data State)
2.  Current Production Behavior (Railway)
3.  Codebase Implementation

**Explicit Constraints:**
- **No Mock Data:** Replace hardcoded frontend mocks with real API calls.
- **Safe Seeding:** Seeding commands must be idempotent or safe to run multiple times (check for existing data).
- **Production Safe:** Do not drop tables or flush the database. Use `update_or_create` or `get_or_create` patterns.

**Priority Order:**
1.  System Health & Observability (Completed)
2.  Usage Events & Transactions (Completed)
3.  Projects & Memberships (Next)
4.  Notifications & Activity Feeds
5.  Settings & Feature Flags
