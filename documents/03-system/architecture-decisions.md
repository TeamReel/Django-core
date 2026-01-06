# Architecture Decision Records (ADRs)

## Overview

Architecture Decision Records (ADRs) document significant architectural decisions made in the Django Core-App project. Each ADR captures the context, decision, consequences, and rationale for important technical choices.

**Purpose**: Preserve context for future maintainers and contributors. When someone asks "Why was it built this way?", ADRs provide the answer.

**Location**: All ADRs are stored in [`docs/system/adr/`](../../../docs/system/adr/)

---

## When to Write an ADR

Create an ADR when making decisions about:

- **Architecture patterns**: Monolith vs microservices, event sourcing, CQRS
- **Data modeling**: Schema design, normalization, storage engines
- **Technology choices**: Database selection, caching strategy, message queues
- **Security approaches**: Authentication methods, encryption standards
- **Performance trade-offs**: Optimization strategies that sacrifice simplicity
- **API contracts**: Breaking changes, versioning strategies
- **Integration patterns**: Third-party service integration approaches

**Rule of Thumb**: If the decision will impact multiple modules or could be questioned later, write an ADR.

---

## ADR Index

### Credits & Transactions (B11)

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-011-001](../../../docs/system/adr/ADR-011-001-single-ledger-vs-double-entry.md) | Single Ledger vs Double-Entry Bookkeeping | ✅ Accepted | 2025-11-22 |
| [ADR-011-002](../../../docs/system/adr/ADR-011-002-computed-vs-stored-balance.md) | Computed vs Stored Balance | ✅ Accepted | 2025-11-22 |
| [ADR-011-003](../../../docs/system/adr/ADR-011-003-idempotency-key-retention.md) | Idempotency Key Retention | ✅ Accepted | 2025-11-22 |
| [ADR-011-004](../../../docs/system/adr/ADR-011-004-redis-cache-invalidation.md) | Redis Cache Invalidation Strategy | ✅ Accepted | 2025-11-22 |

### Scaffolding & Templates (B20, B21)

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-021](../../../docs/system/adr/ADR-021-template-discovery-mechanism.md) | Template Discovery Mechanism | ✅ Accepted | 2025-11-25 |

### Constitutional Engine (B02)

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-022](../../../docs/system/adr/ADR-022-constitutional-validation-integration.md) | Constitutional Validation Integration | ✅ Accepted | 2025-11-26 |

---

## ADR Template

Use this template when creating new ADRs. Save as `docs/system/adr/ADR-[module]-[number]-[short-title].md`.

```markdown
# ADR-[NUMBER]: [TITLE]

**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Date**: YYYY-MM-DD
**Module**: [Bxx - Module Name]
**Deciders**: [Names/Roles]
**Related**: [Links to related ADRs, specs, or issues]

## Context

[Describe the problem, constraints, and forces at play. What decision needs to be made and why?]

**Background**:
- [Key factor 1]
- [Key factor 2]
- [Key constraint or requirement]

**Requirements**:
- [Must have requirement]
- [Nice to have feature]

## Decision

[State the architectural decision clearly and concisely]

**We will**: [Chosen approach]

**Because**: [Primary rationale]

## Options Considered

### Option 1: [Name] (CHOSEN)

**Description**: [How this approach works]

**Pros**:
- ✅ [Advantage 1]
- ✅ [Advantage 2]

**Cons**:
- ❌ [Drawback 1]
- ❌ [Drawback 2]

### Option 2: [Name]

**Description**: [How this approach works]

**Pros**:
- ✅ [Advantage 1]

**Cons**:
- ❌ [Drawback 1]
- ❌ [Drawback 2]

**Why Rejected**: [Specific reason]

### Option 3: [Name]

**Description**: [How this approach works]

**Pros**:
- ✅ [Advantage 1]

**Cons**:
- ❌ [Drawback 1]

**Why Rejected**: [Specific reason]

## Consequences

### Positive

- [Benefit 1]
- [Benefit 2]

### Negative

- [Trade-off 1]
- [Trade-off 2]

### Neutral

- [Side effect 1]
- [Side effect 2]

## Implementation Notes

**Key Changes**:
- [File/module affected]
- [API change]
- [Database schema change]

**Migration Path** (if applicable):
- [Step 1]
- [Step 2]

## References

- [Related spec](../../documents/02-roadmap/modules/done/XXX-Bxx-module.md)
- [External resource](https://example.com)
- [Related issue](https://github.com/your-org/django-core/issues/123)

## Metadata

**Supersedes**: [ADR-XXX] (if applicable)
**Superseded By**: [ADR-YYY] (if deprecated)
**Last Reviewed**: YYYY-MM-DD
```

---

## ADR Numbering Convention

**Format**: `ADR-[MODULE]-[SEQUENCE]-[SHORT-TITLE].md`

**Examples**:
- `ADR-011-001-single-ledger-vs-double-entry.md` - First ADR for B11 (Credits)
- `ADR-021-template-discovery-mechanism.md` - ADR for B20/B21 (Scaffolding)
- `ADR-022-constitutional-validation-integration.md` - ADR for B02 (Constitution)

**Module Codes**:
- Use module number (011 for B11, 022 for B22, etc.)
- Use 000 for cross-cutting/platform-wide decisions
- Frontend modules: F01-F14

**Sequence**:
- Start at 001 within each module
- Increment for each new ADR in that module

**Short Title**:
- Kebab-case
- Descriptive of the decision
- Max 5-6 words

---

## ADR Lifecycle

### 1. Proposed

ADR drafted but not yet implemented. Open for review and discussion.

**Actions**:
- Create PR with ADR draft
- Discuss in PR comments or team meeting
- Iterate based on feedback

### 2. Accepted

Decision finalized and implementation underway or complete.

**Actions**:
- Update status to "Accepted"
- Add date of acceptance
- Link from implementation (code comments, README)

### 3. Deprecated

Decision no longer valid but kept for historical context.

**Actions**:
- Update status to "Deprecated"
- Add deprecation date and reason
- Link to superseding ADR if applicable

### 4. Superseded

Replaced by a newer ADR that makes a different decision.

**Actions**:
- Update status to "Superseded"
- Add "Superseded By: ADR-XXX" link
- Keep for historical reference

---

## Process: Creating an ADR

### Step 1: Identify Decision Need

During feature planning (Spec-Kitty `/spec-kitty.plan`), recognize when architectural choice is needed.

**Trigger Questions**:
- Will this impact multiple modules?
- Could someone question this choice in 6 months?
- Is there more than one valid approach?
- Does this involve significant trade-offs?

### Step 2: Draft ADR

1. Copy [ADR template](#adr-template) above
2. Fill in Context section (problem, constraints)
3. List Options Considered (minimum 2)
4. Document Decision and rationale
5. Capture Consequences (positive/negative/neutral)

**Time Investment**: 30-60 minutes for thorough ADR

### Step 3: Review

1. Create PR with ADR in `docs/system/adr/`
2. Tag relevant stakeholders
3. Discuss trade-offs and alternatives
4. Update based on feedback

**Review Criteria**:
- Context clear and complete?
- Options fairly evaluated?
- Consequences realistic?
- Constitutional compliance verified?

### Step 4: Accept & Implement

1. Merge ADR PR (status: Accepted)
2. Update this index
3. Link ADR from:
   - Module README ([src/module/README.md](../../src/))
   - Implementation code (docstrings/comments)
   - Spec document ([documents/02-roadmap/](../02-roadmap/))

### Step 5: Maintain

- Review ADRs annually or when context changes
- Update status if superseded
- Add "Last Reviewed" date when revalidated

---

## Integration with Spec-Kitty

ADRs are part of the planning phase:

**Workflow**:
1. `/spec-kitty.specify` - Define feature requirements
2. `/spec-kitty.plan` - Research phase identifies architectural decisions needed
3. **Create ADR** - Document decision before implementation
4. `/spec-kitty.tasks` - Reference ADR in implementation tasks
5. `/spec-kitty.implement` - Link ADR in code comments

**Constitution Alignment**: ADRs must comply with [Constitution Article II](../../../.kittify/memory/constitution.md#ii-architecture-and-modularity) (Architecture and Modularity).

---

## Examples of Well-Written ADRs

### Excellent Context

> **ADR-011-001**: "The credits system (B11) requires tracking user balances and transactions. Two approaches exist: (1) single ledger with running balance, or (2) double-entry bookkeeping with debits/credits. Requirement: ACID guarantees, audit trail, simple queries for balance."

**Why Good**: Clear problem statement, constraint identified (ACID), context for decision.

### Thorough Option Analysis

> **ADR-021**: Lists 3 options for template discovery:
> 1. File system scanning (fast, simple, filesystem-bound)
> 2. Database registry (flexible, adds complexity)
> 3. Package metadata (robust, requires packaging)
>
> Each option analyzed with 3+ pros/cons. Chosen option justified with specific reasons.

**Why Good**: Multiple options considered, trade-offs explicit, rejection rationale documented.

### Clear Consequences

> **ADR-011-004**: "Cache invalidation on credit changes means:
> - ✅ Faster balance queries (no DB hit)
> - ❌ Additional Redis dependency
> - ⚠️ Cache stampede risk under high concurrency (mitigated with locks)"

**Why Good**: Positive, negative, and neutral consequences documented. Risks acknowledged with mitigation.

---

## References

- **Constitution**: [Article XI - Documentation](../../../.kittify/memory/constitution.md#xi-documentation-and-knowledge-sharing)
- **Spec-Kitty Workflow**: [documents/06-workflow/spec-kitty.md](../06-workflow/spec-kitty.md)
- **Module Documentation**: [documents/04-modules/](../04-modules/)
- **ADR Pattern**: [https://adr.github.io/](https://adr.github.io/) (External resource)

---

**Last Updated**: 2026-01-05
**Maintained By**: Core-App Architecture Team
