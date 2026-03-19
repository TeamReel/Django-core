# Roadmap & Phases

## 1. Purpose

The Roadmap is the **execution plan** for the Django Core-App. It translates the Vision into a sequence of deliverable units called **Phases**.

## 2. Module Management (Kanban)

We manage progress by moving module **folders** between lifecycle directories in `documents/02-roadmap/modules/`.

*   **[📋 Backlog](modules/backlog/)**: Specified but not started. Each module is a folder with `index.md` + `phases/todo/` + `phases/done/`.
*   **[🚧 Active](modules/active/)**: Currently being built. Phase specs move from `todo/` to `done/` as work progresses.
*   **[✅ Done](modules/done/)**: Fully implemented and merged.

**To update status:** Move the module folder (e.g., `311-B50-scheduled-publishing/`) from `backlog/` to `active/` when starting work, and to `done/` after completion.

## 3. Phase Structure

The project is divided into **18 Development Phases**. Click a phase to see its modules.

### Backend Core (Foundation)
*   **[Phase 1: Foundation & Governance](deployment-phases/phase-01-foundation-and-governance.md)** (Modules 001-004) ✅
*   **[Phase 2: Identity & Multi-Tenancy](deployment-phases/phase-02-identity-and-multi-tenancy.md)** (Modules 005-008) ✅
*   **[Phase 3: Configuration, Audit & Transactions](deployment-phases/phase-03-configuration-audit-and-transactions.md)** (Modules 009-012) ✅
*   **[Phase 4: Interfaces & Communication](deployment-phases/phase-04-interfaces-and-communication.md)** (Modules 013-017) ✅
*   **[Phase 5: Operationalisation](deployment-phases/phase-05-operationalisation.md)** (Modules 018-021) ✅

### Frontend Core (UX)
*   **[Phase 6: Frontend Foundations](deployment-phases/phase-06-frontend-foundations.md)** (Modules 022-025) ✅
*   **[Phase 7: Frontend Resources & Integration](deployment-phases/phase-07-frontend-resources-and-integration.md)** (Modules 026-030) ✅

### Demo Foundation (Validation)
*   **[Phase 8: Demo Foundation](deployment-phases/phase-08-demo-foundation.md)** (Modules 031-033) ✅

### Extended Capabilities
*   **[Phase 9: Backend Infrastructure](deployment-phases/done/phase-09-backend-infrastructure.md)** (Modules 034-038) ✅
*   **[Phase 10: Content Engine Core](deployment-phases/done/phase-10-content-engine-core.md)** (Modules 039-044) ✅
*   **Accelerated Modules** (045-049): B39, B40, B41, B37, B55 ✅

### Frontend Improvement Roadmaps — ✅ Done (`done/`)

16 afgeronde roadmaps, ~175 fases. Zie **[done/index.md](done/index.md)** voor volledig overzicht.

*   01 — [Frontend Refactoring](done/01_frontend-refactoring/index.md) (40 fases ✅)
*   02 — [Mobile-First App Design](done/02_mobile-design/index.md) (27 fases ✅)
*   03 — [Create Wizard Optimization](done/03_wizard-optimization/index.md) (13 fases ✅)
*   04 — [8pt Grid Alignment](done/04_8pt-grid-alignment/index.md) (7/7 ✅)
*   05 — [Design System Adoption](done/05_design-system-adoption/index.md) (11/11 ✅)
*   06 — [Frontend Tech Debt](done/06_frontend-tech-debt/index.md) (12/12 ✅)
*   07 — [Frontend Structural Debt](done/07_frontend-structural-debt/index.md) (17/17 ✅)
*   08 — [Frontend Final Cleanup](done/08_frontend-final-cleanup/index.md) (12/12 ✅)
*   09 — [Frontend Hardening](done/09_frontend-hardening/index.md) (12/12 ✅)
*   10 — [Repo Hygiene](done/10_repo-hygiene/index.md) (5/5 ✅)
*   11 — [Docs Hygiene](done/11_docs-hygiene/index.md) (4/4 ✅)
*   12 — [Docs Refactor](done/12_docs-refactor/index.md) (5/5 ✅)
*   13 — [Navigation Architecture](done/13_navigation-architecture/index.md) (10/10 ✅)
*   14 — [Frontend Consistency](done/14_frontend-consistency/index.md) (12/12 ✅)
*   15 — [Frontend UX Debt](done/15_frontend-ux-debt/index.md) (15/15 ✅)
*   16 — [Frontend Technical Debt](done/16_frontend-technical-debt/index.md) (15/15 ✅)

### Frontend Improvement Roadmaps 17–31 — Done

*   17 — [Frontend Performance & Accessibility](done/17_frontend-performance-a11y/index.md) (9/9)
*   18 — [Navigation UX Consistency](done/18_navigation-ux-consistency/index.md)
*   19 — [Dashboard Inline Sheets](done/19_dashboard-inline-sheets/index.md)
*   20 — [Dashboard Command Center](done/20_dashboard-command-center/index.md)
*   21 — [Dashboard UX Gamification](done/21_dashboard-ux-gamification/index.md)
*   22 — [Frontend Quality Hardening](done/22_frontend-quality-hardening/index.md)
*   23 — [Dashboard Match Status](done/23_dashboard-match-status/index.md)
*   24 — [Dashboard UI Polish](done/24_dashboard-ui-polish/index.md)
*   25 — [Team Page Mobile](done/25_team-page-mobile/index.md)
*   26 — [My Team Hub](done/26_my-team-hub/index.md)
*   27 — [Engagement Features](done/27_engagement-features/index.md)
*   28 — [My Team Page Fixes](done/28_my-team-page-fixes/index.md)
*   29 — [My Team UX Hardening](done/29_my-team-ux-hardening/index.md)
*   30 — [Premium UX Modules](done/30_premium-ux-modules/index.md)
*   31 — [Activity Feed Integration](done/31_activity-feed-integration/index.md)

### Planned Phases
*   **[Phase 11: Frontend & Visual Development](deployment-phases/planned/phase-11-frontend-and-visual-development.md)** (Modules 045-047) 📋
*   **[Phase 12: Workflows & Payments](deployment-phases/planned/phase-12-workflows-and-payments.md)** — B37 ✅, B36/B38 📋
*   **[Phase 13: Advanced UI](deployment-phases/planned/phase-13-advanced-ui.md)** 📋
*   **[Phase 14: Data Foundations Part 2](deployment-phases/phase-14-data-foundations-part-2.md)** (Modules 054-058) 📋
*   **[Phase 15: ML/AI Platform](deployment-phases/phase-15-ml-ai-platform.md)** (Modules 059-064) 📋
*   **[Phase 16: Platform Quality Gates](deployment-phases/phase-16-platform-quality-gates.md)** (Modules 065-069) 📋
*   **[Phase 17: Integration Ecosystem](deployment-phases/phase-17-integration-ecosystem.md)** (Modules 070-071) 📋
*   **[Phase 18: Operations & Resilience](deployment-phases/phase-18-operations-and-resilience.md)** (Modules 072) 📋

## 4. Status Definitions

We use strict definitions for phase status to manage expectations:

| Status | Definition |
| :--- | :--- |
| **✅ COMPLETE** | Fully implemented, tested, and merged. Ready for production use. |
| **🚧 IN PROGRESS** | Currently being built. Code exists but may be unstable or incomplete. |
| **📋 PLANNED** | Specified but not started. Subject to change. |

## 5. The Demo Evolution

The Roadmap drives the Demo.
*   **Phases 1–7** built the engine.
*   **Phase 8** builds the car (the Demo Shell).
*   **Future Phases** will add features (GPS, Stereo) to the car.

Every completed phase MUST eventually be visible or verifiable in the Demo Shell.


**See Also:**
*   **[Full Roadmap](roadmap.md)**: Complete phase breakdown with module details.
*   **[Module Status](modules/)**: Kanban-style module tracking.
*   **[Implementation Details](../04-modules/index.md)**: Technical documentation for each module.

## Keeping module links stable

Markdown can’t maintain “dynamic links” automatically when filenames change (e.g., after renumbering). The recommended approach is to treat module codes as the stable identifier (B30, D06, F13, etc.) and use a small script to rewrite links to the current filenames.

Run:

```powershell
# Preview changes
python scripts/roadmap/update_module_links.py --dry-run

# Apply changes
python scripts/roadmap/update_module_links.py --write
```
