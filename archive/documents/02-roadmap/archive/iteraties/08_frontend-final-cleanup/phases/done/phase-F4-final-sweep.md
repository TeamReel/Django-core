# F4 — Final Sweep (300-350 lines)

**Status:** 🔲 Todo
**Effort:** 8 uur
**Scope:** ~88 remaining files 300-350 lines → all <300

---

## Doel

Alle resterende files >300 lines splitsen. Dit is de "long tail" — veel kleinere splitsingen.

## Approach

### 1. Batch by Type

| Type | Count | Strategy |
|------|-------|----------|
| Data hooks | ~35 | Extract fetchers/transformers |
| Components | ~30 | Extract sub-components |
| Pages | ~15 | Use composition patterns |
| Utilities | ~8 | Group by domain |

### 2. Quick Wins

Veel 300-350 line files hebben:
- Imports die 30+ lines zijn → barrel imports
- Comments/JSDoc die 20+ lines zijn → keep
- Whitespace → no change

Focus op **actual code reduction**, niet cosmetisch.

### 3. Skip candidates

Files die bewust groot mogen zijn:
- Test factory files (veel data = ok)
- Config files met veel entries
- Type definition files met veel interfaces

## Verificatie

- [ ] All files <300 lines (excl. justified exceptions)
- [ ] Max 10 exceptions documented met reden
- [ ] `npx tsc --noEmit` passing
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na F4:
- **Files >300 lines:** ≤10 (gedocumenteerde uitzonderingen)
- **Average file size:** <150 lines
