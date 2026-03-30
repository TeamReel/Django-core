# Testing Documentation

**Purpose:** Testing documentation including manual test guides and quality processes.

---

## Contents

### [Manual Tests](manual-tests/)
Visual and manual testing guides for TeamReel features.

**Structure:**
- **[done/](manual-tests/done/)** — Completed and verified test guides
- **[todo/](manual-tests/todo/)** — Test guides awaiting execution

**Quick Links:**
- [Manual Testing README](manual-tests/README.md) — Testing workflow and guide

---

## Testing Standards

1. **Every feature has tests** — pytest for backend, Playwright for critical E2E flows
2. **Every bugfix has a regression test**
3. **Verify before merge**: `pytest` (backend), `npx tsc --noEmit` + `npx vite build` (frontend)
4. **Comprehensive Coverage**: Backend (≥90%), Frontend (visual + functional)

---

## Related Documentation

- **[Module Implementation](../04-modules/index.md)** - What's built and ready to test
- **[Demo Status](../05-demo/index.md)** - Current demo implementation
- **[Constitution](../03-system/constitution.md)** - Quality standards and test coverage requirements

---

*Testing validates the 80% foundation. Every module must be testable and tested.*
