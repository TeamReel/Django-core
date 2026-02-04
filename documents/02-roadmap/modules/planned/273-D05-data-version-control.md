# Fase 13: Data Foundations Part 1

## 59. D05 – Data Version Control

**Doel**: Version control voor datasets (snapshots, diffs, rollback) - Git for data.

**Waarom agnostisch**: Data versioning is universeel - reproducibility, rollback, experimentation.

**Wat moet er gebeuren**:
- Snapshot creation (capture dataset state)
- Diff viewer (compare versions, show changes)
- Rollback (restore previous version)
- Branch/merge (experimental branches)
- Delta compression (space-efficient storage)

**Demo Requirements**:
- 🔀 **Data Versions** (`/demo/datasets/{id}/versions`): Version timeline → diff viewer → rollback
- Tests: create snapshot → modify data → compare → rollback → verify

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=D05-data-version-control

[feature summary]
Version control for datasets (snapshots, diffs, rollback) - Git for data.

[goals]
- Snapshot creation <10s for 100K rows
- Diff viewer (highlight changes)
- Rollback to exact previous state
- Delta compression (>70% space savings)
- D03 dataset registry integration

[demo requirements]
Demo page: /demo/datasets/{id}/versions
- Version timeline
- Diff viewer (added/removed/modified)
- Rollback action
- Tags (prod, staging, experimental)
```

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
