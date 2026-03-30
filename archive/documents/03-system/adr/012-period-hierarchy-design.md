# ADR 012: Period Hierarchy Design

**Status**: Accepted
**Date**: 2026-01-05
**Authors**: Core Team
**Related**: B30 Activities & Period Hierarchy

## Context

Products require flexible time-based organization of activities. Use cases span:
- Sports: Season → Competition Phase → Month → Week
- Business: Fiscal Year → Quarter → Month → Sprint
- Education: Academic Year → Semester → Module → Week

Requirements:
1. Unlimited depth (no fixed hierarchy levels)
2. Efficient tree navigation (ancestors, descendants)
3. Zero external dependencies
4. Performance <500ms for queries up to 10 levels deep

## Decision

Implement self-referential foreign key with PostgreSQL recursive CTE (Common Table Expression) via custom Django QuerySet manager.

**Model Design**:
```python
class Period(models.Model):
    parent_period = models.ForeignKey('self', null=True, on_delete=PROTECT)
    # ... other fields
```

**Tree Navigation**:
```python
class PeriodQuerySet(models.QuerySet):
    def get_descendants(self, period_id):
        # PostgreSQL recursive CTE
        query = """
            WITH RECURSIVE period_tree AS (
                SELECT id FROM activities_period WHERE parent_period_id = %s
                UNION ALL
                SELECT p.id FROM activities_period p
                INNER JOIN period_tree pt ON p.parent_period_id = pt.id
            )
            SELECT id FROM period_tree
        """
        ...
```

## Alternatives Considered

### Alternative 1: django-treebeard (MPTT - Modified Preorder Tree Traversal)

**Pros**:
- Battle-tested library with ~2k stars
- Optimized for read-heavy workloads (single query for descendants)
- Automatic tree management (left/right values)

**Cons**:
- External dependency (violates Constitution III: "Curated Dependencies")
- Tree rebalancing overhead on writes (inserts shift left/right values)
- More complex to debug (MPTT values non-intuitive)
- Overkill for typical hierarchy depths (<10 levels)

**Rejected because**: Spec prioritizes zero external dependencies and simple implementation over micro-optimization. Constitution Article III requires "curated dependencies" - only add libraries when absolutely necessary. Self-referential FK + CTE provides sufficient performance for spec requirements (<500ms for 10 levels) without external dependency burden.

### Alternative 2: Fixed-Depth Models (e.g., Season → Phase → Month)

**Pros**:
- Simple schema (3 separate models)
- No recursive queries needed
- Explicit field names (season, phase, month)

**Cons**:
- Inflexible (cannot handle 2-level or 5-level hierarchies)
- Violates product-agnostic principle (assumes sports domain structure)
- Code duplication across hierarchy levels
- Cannot support dynamic depth (e.g., Business: Year → Quarter → Month vs Education: Year → Semester)

**Rejected because**: Spec explicitly requires unlimited-depth flexibility for diverse products. Constitution Article I mandates "product-agnostic" Core - cannot assume fixed hierarchy structure. Different products need 2-15 levels; fixed schema cannot accommodate this variability.

### Alternative 3: Materialized Path (path = "001.003.007")

**Pros**:
- Fast descendant queries (LIKE 'path%')
- No CTE complexity
- Works on non-PostgreSQL databases (MySQL, SQLite)

**Cons**:
- Path column management overhead (must update all descendants when moving subtree)
- Fixed path segment width limits (e.g., 3 digits = max 999 children per node)
- Harder to debug (path strings less readable than parent_id)
- Not needed until 15+ levels (spec only guarantees 10)

**Rejected because**: CTE simpler for common case (<10 levels). Materialized path can be added later as optimization if needed. Premature optimization violates Constitution Article IX (Dogfooding) - optimize only when proven bottleneck exists. Path maintenance complexity (updating entire subtree on move) outweighs benefits for typical use cases.

### Alternative 4: Closure Table (separate ancestor-descendant mapping table)

**Pros**:
- Fastest descendant queries (single JOIN)
- Supports multiple parents (DAG structure)

**Cons**:
- Significant storage overhead (O(n²) for deep trees)
- Maintenance complexity (triggers to keep closure table in sync)
- Overkill for tree structure (periods have single parent)

**Rejected because**: Storage and maintenance complexity not justified for single-parent tree. Constitution Article I mandates simplicity - closure table adds database triggers and separate table maintenance. Tree structure doesn't require DAG (directed acyclic graph) flexibility; single-parent FK sufficient.

## Consequences

### Positive

- ✅ **Zero dependencies**: No external libraries required (Constitution III compliance)
- ✅ **Simple schema**: Single `parent_period_id` FK, easy to understand
- ✅ **Flexible depth**: Supports 2-level to 20-level hierarchies without schema changes
- ✅ **Performance**: <500ms for 10-level hierarchies (meets spec SC-007)
- ✅ **Product-agnostic**: Works for sports, business, education use cases (Constitution I compliance)

### Negative

- ❌ **PostgreSQL-only**: Recursive CTE not supported in MySQL/SQLite (acceptable trade-off, Core targets PostgreSQL 9.4+)
- ❌ **Write complexity**: Moving subtrees requires updating parent_period_id for all descendants (mitigated: rare operation in typical use cases)
- ❌ **Performance degradation >15 levels**: Not performance-tested beyond 10 levels (mitigated: soft warning at 11+, materialized path recommendation)

### Neutral

- ⚠️ **CTE query complexity**: Recursive SQL harder to understand than simple FK queries (mitigated: encapsulated in QuerySet manager, documented)
- ⚠️ **No cycle detection**: Application must prevent user from setting parent_period to descendant (mitigated: serializer validation prevents cycles)

## Implementation Notes

1. **Soft warning at 11+ levels**: Display UI warning recommending materialized path if hierarchy exceeds 10 levels
2. **Performance monitoring**: Add metrics for `get_descendants()` query times (integrate with B09)
3. **Future optimization**: If query times exceed 500ms, add materialized path column without breaking API
4. **Migration path**: Materialized path can be added as denormalized cache column without removing parent_period FK

## References

- [PostgreSQL Recursive CTE documentation](https://www.postgresql.org/docs/current/queries-with.html)
- Spec: `kitty-specs/039-activities-period-hierarchy/spec.md` (SC-007, FR-003, FR-009)
- Research: `kitty-specs/039-activities-period-hierarchy/research.md` (Decision 1: Tree Implementation)
- Constitution Article I: Product-Agnostic Core
- Constitution Article III: Curated Dependencies
- Constitution Article IX: Dogfooding
