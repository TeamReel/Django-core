# Fase 13: Data Foundations Part 1

## 57. D03 – Dataset Management & Lineage

**Doel**: Central registry voor datasets met metadata, schema, lineage tracking.

**Waarom agnostisch**: Dataset catalogs zijn universeel - track data sources, dependencies, schemas.

**Wat moet er gebeuren**:
- Dataset registry (name, description, schema, owner, tags)
- Lineage tracking (graph van upstream/downstream dependencies)
- Schema evolution (track changes over time)
- Access control (B08 permissions per dataset)
- Usage metrics (queries, transformations, consumers)

**Demo Requirements**:
- 📊 **Dataset Catalog** (`/demo/datasets`): List datasets → lineage graph → version comparison
- Tests: register dataset → query lineage → compare schemas

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=D03-dataset-management-lineage

[feature summary]
Central registry for datasets with metadata, schema, lineage tracking.

[goals]
- Dataset registry with CRUD
- Lineage graph visualizer
- Schema diff viewer
- Permission checks (B08)
- Usage tracking (B11)

[demo requirements]
Demo page: /demo/datasets
- List datasets
- Lineage graph (upstream/downstream)
- Schema version comparison
- Access control checks
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
