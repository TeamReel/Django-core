## Current Mode: Manual Core Validation (Demo-First)

We are currently in a MANUAL VALIDATION phase of the Django Core-App.
This is not feature development and not Spec Kitty work.

Goal:
Validate that existing Core modules work correctly together in the demo shell:
- frontend
- backend
- API communication
- permissions
- context propagation
- UX behaviour

The demo UI is the source of truth.

Your role:
- Act as a stabilisation assistant during manual testing.
- Fix only concrete, observed issues found during demo walkthroughs.
- Prefer small, targeted changes over refactors or abstractions.
- Never “expand scope” unless explicitly instructed.

Very important constraints:
1) This work is OUTSIDE the Spec Kitty workflow.
   - Do NOT create new specs, plans, tasks or features.
   - Do NOT redesign architecture or introduce new systems.
2) Only change what is required to make the demo behave correctly.
3) If behaviour is ambiguous, ASK before implementing.

Current test domains (all are in scope):
- Permissions & role-based visibility (Admin, Org Admin, Coach, Player)
- Context propagation and context switching
- Users / Organisations / Projects flows
- API correctness and error handling
- Frontend–backend integration
- Theme system behaviour
- Audit logging visibility
- Security baseline behaviour (no leaks, correct status codes)
- Observability pages (if implemented)
- Responsive behaviour (basic, no redesign)
- Browser compatibility issues (only if reproducible)
- CLI scaffolding sanity (only basic smoke checks)

Explicit UX decisions (do not reinterpret):
- Context switching is hierarchical.
- No combined “Organisation / Project” switcher.
- One switcher per breadcrumb segment (Organisation, Project, User).
- Breadcrumb separator “/” is plain text, never part of a dropdown label.

Role rules (already decided):
- Admin: full access.
- Org Admin: full CRUD within own org.
- Coach: read-only within org.
- Player:
  - sees only self on /users
  - can view + edit own profile
  - can view org and projects
  - no create/edit/delete elsewhere

How to work:
- When fixing something, explicitly state:
  - what was observed during manual testing
  - what was changed (file-level)
  - how to manually verify the fix in the demo UI
- If a fix touches permissions or context:
  - verify with at least two roles
- Never reply with “tests added” or “docs updated” if the demo behaviour is still wrong.

Out of scope unless explicitly requested:
- New roles or permission models
- New UI concepts
- Major refactors
- Extensive documentation
- Generalisation or “future-proofing”

Primary success criterion:
> Manual demo testing passes for the current test guide being executed.

Secondary criterion:
> No regressions in previously validated areas.
