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
---

## Spec-Kitty Decision Support Protocol

When executing spec-kitty workflow commands (`/spec-kitty.specify`, `/spec-kitty.clarify`, `/spec-kitty.plan`), **ALWAYS** provide decision support for ambiguous or multi-option scenarios:

### Decision Analysis Framework

For each clarification question or planning decision with multiple valid options:

1. **Present Options Clearly**: List 2-5 distinct, mutually exclusive options (A, B, C, etc.)

2. **Analyze Trade-offs**: For EACH option, provide:
   - ✅ **Voordelen (Advantages)** - What this option enables or solves
   - ❌ **Nadelen (Disadvantages)** - What this option compromises or complicates

3. **Apply Project Context**: Evaluate each option against:
   - **PROJECT_VISION.md** (`docs/project/PROJECT_VISION.md`)
     - 80/20 Foundation Principle
     - Product-Agnostic Constraint (Principle I)
     - Architecture & Modularity (Principle II)
     - Security & Privacy (Principle V)
     - "Guardrails not walls" philosophy
     - Constitutional governance requirements
   - **Project Roadmap** (Fase 1-13 phasing, current phase priorities)
   - **Constitution Principles** (as defined in PROJECT_VISION.md sections 4 & 9)

4. **Provide Explicit Recommendation**: Based on analysis, state:
   - ⭐ **AANBEVOLEN**: [Option X]
   - **Rationale**: 2-3 bullet points explaining why this option best serves the Core-App's mission
   - **Implementation Notes** (if applicable): Brief guidance on how to implement extensibly

5. **Extensibility Consideration**: When applicable, note how the recommended option can be:
   - Extended via B10 Feature Flags
   - Overridden by downstream products
   - Configured for different security/performance profiles

### Example Decision Pattern

```markdown
**Clarification: What should system do when [scenario]?**

Options:
(A) [Conservative approach]
(B) [Balanced approach]
(C) [Flexible approach]

## Optie A: [Conservative]
**Voordelen:**
- ✅ [Security benefit]
- ✅ [Compliance benefit]

**Nadelen:**
- ❌ [User friction]
- ❌ [Not product-agnostic]

## Optie B: [Balanced]
**Voordelen:**
- ✅ [Good security default]
- ✅ [Product-agnostic]

**Nadelen:**
- ⚠️ [Some limitation]

## Optie C: [Flexible]
**Voordelen:**
- ✅ [Maximum flexibility]

**Nadelen:**
- ❌ [Weaker security posture]

## Aanbeveling: **Optie B** ⭐

**Rationale voor Core-App:**
1. **80/20 Foundation**: Provides [X] without [Y rigidity]
2. **Product-Agnostic**: Different downstream products can [customize]
3. **[Principle alignment]**: Matches [specific principle from vision]
4. **Extensibility**: Via B10 Feature Flags, products can opt-in to [stricter mode]

**Implementation:**
\`\`\`python
# Default behavior (80% foundation)
if [scenario]():
    [balanced_action]()

# Optional override via B10
if feature_flags.get("[optional_strict_mode]"):
    [strict_action]()
\`\`\`
```

### When to Apply

- ✅ **ALWAYS** during `/spec-kitty.clarify` when asking clarification questions
- ✅ **ALWAYS** during `/spec-kitty.plan` when architectural decisions have multiple valid approaches
- ✅ **ALWAYS** during `/spec-kitty.specify` when initial requirements have ambiguous security/UX trade-offs
- ❌ **SKIP** for trivial single-option scenarios (e.g., "use standard REST endpoint pattern")

### Mandatory References

Every decision analysis MUST reference:
- `docs/project/PROJECT_VISION.md` - Core principles and 80/20 philosophy
- Relevant Constitution principles (Security, Testing, Modularity, etc.)
- Current project phase context (which Fase are we in?)

This ensures all decisions strengthen the **80% foundation** while remaining **product-agnostic and extensible**.
