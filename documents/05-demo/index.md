# Demo Shell

## Purpose

The **Demo Shell** (Phase 8) is the reference implementation of the Core-App. It serves two critical purposes:

1.  **Validation**: It proves that the underlying modules (Auth, Orgs, API) work together in a real application.
2.  **Showcase**: It provides a tangible "product" that stakeholders can interact with.

## The "Football Leagues" Scenario

To avoid generic "Foo/Bar" examples, the Demo Shell implements a realistic SaaS scenario: **Football League Management**.

*   **Organization**: A Football League (e.g., "Premier League").
*   **Project**: A Season (e.g., "2023/2024").
*   **Members**: League Admins, Team Managers, Referees.
*   **Resources**: Teams, Matches, Players.

## Integration Rules

1.  **No Mock Data**: The Demo Shell must consume real APIs from the Backend Core.
2.  **Module Isolation**: The Demo Shell code (`F10`) should be separate from the reusable UI components (`F01-F07`).
3.  **Production Ready**: It must be deployable and secure, not just a local prototype.

## Accessing the Demo

*   **Live URL**: [https://demo.teamreel.app](https://demo.teamreel.app)
*   **API Root**: [https://api.teamreel.app/api/v1/](https://api.teamreel.app/api/v1/)
*   **Local Dev**: `pnpm dev` (Frontend) + `python manage.py runserver` (Backend)

## Key Endpoints

*   **Files**: `/api/v1/files/` (Replaces legacy `/api/files/`)
*   **Audit Log**: `/api/v1/activity/` (Replaces legacy `/api/audit/`)
*   **Tasks**: `/api/v1/tasks/` (Secured monitoring)

## Current Status

*   [Demo Data Status](demo-data-status.md): Dashboard of seeded data and module readiness.
*   [Production DB Audit](production-db-audit.md): Detailed analysis of the production database state (Jan 2026).

## Archive

*   [Archive](archive/): Past audit reports and integration logs.
