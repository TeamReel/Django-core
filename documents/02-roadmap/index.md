# Roadmap & Phases

## 1. Purpose

The Roadmap is the **execution plan** for the Django Core-App. It translates the Vision into a sequence of deliverable units called **Phases**.

## 2. Module Management (Kanban)

We manage progress by moving module files between status folders in `documents/02-roadmap/modules/`.

*   **[✅ Done](modules/done/)**: Fully implemented and merged.
*   **[🚧 In Progress](modules/in-progress/)**: Currently being built.
*   **[📋 Planned](modules/planned/)**: Specified but not started.

**To update status:** Simply drag the module file (e.g., `B22.md`) from `planned` to `in-progress`.

## 3. Phase Structure

The project is divided into **18 Development Phases**. Click a phase to see its modules.

### Backend Core (Foundation)
*   **[Phase 1: Foundation & Governance](phases/phase-01-foundation-and-governance.md)** (Modules 001-004) ✅
*   **[Phase 2: Identity & Multi-Tenancy](phases/phase-02-identity-and-multi-tenancy.md)** (Modules 005-008) ✅
*   **[Phase 3: Configuration, Audit & Transactions](phases/phase-03-configuration-audit-and-transactions.md)** (Modules 009-012) ✅
*   **[Phase 4: Interfaces & Communication](phases/phase-04-interfaces-and-communication.md)** (Modules 013-017) ✅
*   **[Phase 5: Operationalisation](phases/phase-05-operationalisation.md)** (Modules 018-021) ✅

### Frontend Core (UX)
*   **[Phase 6: Frontend Foundations](phases/phase-06-frontend-foundations.md)** (Modules 022-025) ✅
*   **[Phase 7: Frontend Resources & Integration](phases/phase-07-frontend-resources-and-integration.md)** (Modules 026-030) ✅

### Demo Foundation (Validation)
*   **[Phase 8: Demo Foundation](phases/phase-08-demo-foundation.md)** (Modules 031-033) ✅

### Extended Capabilities
*   **[Phase 9: Backend Infrastructure](phases/done/phase-09-backend-infrastructure.md)** (Modules 034-038) ✅
*   **[Phase 10: Content Engine Core](phases/done/phase-10-content-engine-core.md)** (Modules 039-044) ✅
*   **Accelerated Modules** (045-049): B39, B40, B41, B37, B55 ✅

### Frontend Improvement Roadmaps
*   **[Design System Adoption](design-system-adoption/index.md)** (11/11 ✅)
*   **[Frontend Tech Debt](frontend-tech-debt/index.md)** (12/12 ✅)
*   **[Frontend Structural Debt](frontend-structural-debt/index.md)** (17/17 ✅)
*   **[Frontend Final Cleanup](frontend-final-cleanup/index.md)** (12/12 ✅)
*   **[Frontend Hardening](frontend-hardening/index.md)** (12/12 ✅)
*   **[Navigation Architecture](navigation-architecture/index.md)** (0/10 🔄 Actief)
*   **[Wizard Optimization](wizard-optimization/index.md)** (Actief)

### Planned Phases
*   **[Phase 11: Frontend & Visual Development](phases/planned/phase-11-frontend-and-visual-development.md)** (Modules 045-047) 📋
*   **[Phase 12: Workflows & Payments](phases/planned/phase-12-workflows-and-payments.md)** — B37 ✅, B36/B38 📋
*   **[Phase 13: Advanced UI](phases/planned/phase-13-advanced-ui.md)** 📋
*   **[Phase 14: Data Foundations Part 2](phases/phase-14-data-foundations-part-2.md)** (Modules 054-058) 📋
*   **[Phase 15: ML/AI Platform](phases/phase-15-ml-ai-platform.md)** (Modules 059-064) 📋
*   **[Phase 16: Platform Quality Gates](phases/phase-16-platform-quality-gates.md)** (Modules 065-069) 📋
*   **[Phase 17: Integration Ecosystem](phases/phase-17-integration-ecosystem.md)** (Modules 070-071) 📋
*   **[Phase 18: Operations & Resilience](phases/phase-18-operations-and-resilience.md)** (Modules 072) 📋

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
