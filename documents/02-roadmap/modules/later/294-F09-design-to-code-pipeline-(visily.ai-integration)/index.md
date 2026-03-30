# Fase 11: Frontend & Visual Dev

## 46. F09 – Design-to-Code Pipeline (Visily.ai Integration)

**Doel**: Pipeline om Visily.ai design exports te converteren naar werkende React components met F01 design system.

**Waarom agnostisch**: Design-to-code workflow is universeel - designers create UI  developers implement faster.

**Wat moet er gebeuren**:
- Visily parser voor JSON/Figma format export
- Component mapper (Rectangle  Box, Text  Text, Button  Button, etc.)
- Code generator voor React/TypeScript met F01 imports
- Live preview (design vs generated, side-by-side)
- CLI tool + web UI in demo-shell

**Demo Requirements**:
-  **Design-to-Code Page** (`/demo/design-to-code`): Upload Visily export  generate React code  live preview  download/copy
- Tests: upload design  generate  preview  verify match

**Status**:  ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=F09-design-to-code-pipeline-visily

[feature summary]
Design-to-code pipeline converting Visily.ai exports to React components using F01 design system.

[goals]
- Parse Visily export format
- Map design  F01 components
- Generate clean React/TypeScript code
- Live preview
- CLI + web UI

[demo requirements]
Demo page: /demo/design-to-code
- Upload Visily export.json
- Original design preview
- Generate button  React code
- Live preview (side-by-side)
- Copy/download/save actions
- Tests: upload  generate  preview  verify match
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
