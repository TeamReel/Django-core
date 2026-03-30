# Fase 15: ML/AI Platform

## 66. D12 – Model Registry

**Doel**: Central registry voor ML models met lifecycle management (dev → staging → prod).

**Waarom agnostisch**: Model registries zijn universeel - version control, deployment, rollback.

**Wat moet er gebeuren**:
- Model versioning (SHA256 hash + metadata)
- Stage transitions (promote/rollback tussen dev/staging/prod)
- Metadata storage (training params, metrics, dataset version, author)
- Artifact storage via D01
- Lineage tracking (link to training datasets via D03)

**Demo Requirements**:
- 🤖 **Model Registry** (`/demo/models`): List models → versions → promote/rollback → metadata
- Tests: register model → promote → rollback → verify lineage

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=D12-model-registry

[feature summary]
Central registry for ML models with lifecycle management.

[goals]
- Register model with version + metadata
- Promote model dev → staging → prod
- Rollback restores previous prod version
- Lineage graph shows training dataset (D03)
- D09 evaluation gate blocks prod promotion if metrics fail

[demo requirements]
Demo page: /demo/models
- List models and versions
- Promote/rollback actions
- Metadata viewer
- Lineage graph
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
