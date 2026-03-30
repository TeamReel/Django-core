# Fase 12: Advanced UI

## 54. F15 – Frontend Form Components

**Doel**: Advanced form components - multi-step wizards, conditional fields, auto-save, validation.

**Waarom agnostisch**: Complex forms zijn universeel - onboarding flows, settings, data entry.

**Wat moet er gebeuren**:
- MultiStepForm (wizard met progress, step validation)
- ConditionalFields (show/hide based on values)
- AutoSaveForm (debounced auto-save)
- FileUploadField (drag-drop via B22)
- RichTextField (wrapper voor F13)

**Demo Requirements**:
-  **Forms Demo** (`/demo/forms`): Multi-step wizard  validation  auto-save
- Tests: complete wizard  verify auto-save  submit  verify

**Status**:  ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=F15-frontend-form-components

[feature summary]
Advanced form components with multi-step wizards, validation, auto-save.

[goals]
- MultiStepForm with 10+ steps
- Auto-save max 1x per 2 seconds
- Client-side validation (Zod schemas)
- Server-side error mapping
- Accessibility (keyboard navigation, screen readers)

[demo requirements]
Demo page: /demo/forms
- Multi-step wizard example
- Auto-save demonstration
- Validation demos
- File upload field
- Conditional fields
- Tests: complete wizard  auto-save  validate  submit
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
