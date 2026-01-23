# Current Mode: Modular Development & TeamReel Integration

**Goal:** Build the TeamReel web application (SaaS Boilerplate + Football Logic) iteratively, module by module.
**Principle:** 80/20 Rule. Build the core foundation (80% value) first. Avoid premature optimization.

## Workflow: Module-by-Module
1.  **Select Module:** Pick the next domain (e.g., Competition, Match, Player) based on the Roadmap.
2.  **Specify:** Define pure requirements in `documents/`. Use "Spec-Kitty" logic to clarify 80/20 boundaries.
3.  **Build (Core-App):** Implement Models, API, and Business Logic in Django.
    *   *Constraint:* Must be product-agnostic (Core), extensible via B10 Feature Flags.
4.  **Integrate (Frontend):** Build/Update React components in `demo/` to consume the new API.
5.  **Test:**
    *   Unit Tests (Backend + Frontend).
    *   Manual verification in Browser.
6.  **Deploy:** Validate against Railway (Production DB safety is paramount).
7.  **Document:** Update state in `documents/` (reflecting reality).

## Architecture & Integration
*   **Backend:** Django REST Framework (Railway Service: `backend`).
*   **Frontend:** React/Vite (Vercel/Netlify).
*   **Database:** PostgreSQL (Railway). **NEVER DROP TABLES.** Use safe migrations (`update_or_create`).
*   **Code Quality:** PEP8, Type Hints, clean imports.

## Decision Support Protocol (Spec-Kitty)
When clarifying requirements or choosing architectural paths:
1.  **Options:** Present 2-3 distinct options.
2.  **Trade-offs:** Analyze Pros/Cons for each.
3.  **Context:** Evaluate against **80/20 Principle** and **Production Safety**.
4.  **Recommendation:** Explicitly recommend the option that best fits the Core-App foundation.

## Sources of Truth
1.  `documents/` - Active documentation.
2.  **Codebase** - The implementation.
3.  **Railway/Production** - The real-world data state.
