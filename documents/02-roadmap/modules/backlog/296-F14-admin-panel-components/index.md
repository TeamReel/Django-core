# F14: Admin Panel Components

**Phase:** 12
**Status:** 📋
**Module ID:** 051
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 51. F14 – Admin Panel Components

**Feature**: `F14-admin-panel-components`

**Doel**: Herbruikbare admin panel componenten voor content management (users, organisations, projects).

**Package**: `@django-core/admin-panel`

**Dependencies**:
- `@django-core/design-system` (F01) - core components
- `@django-core/auth` (F02) - authentication state
- Backend: B05 (auth), B06 (orgs), B07 (projects), B08 (permissions)

**Core Componenten**:
- `AdminTable` - Sorteerbare tabel met bulk actions, filtering, pagination
- `AdminForm` - Auto-generated forms met validatie
- `AdminPanel` - Layout wrapper met sidebar navigation
- `BulkActions` - Multi-select met actions (delete, export, change status)
- `QuickFilters` - Predefined filters voor common queries

**Demo Page**: ⚙️ `/admin` - Users/orgs/projects management, CRUD operations, bulk actions

**Acceptance Criteria**:
- [ ] AdminTable met 100+ items rendert <200ms
- [ ] Bulk actions op 50+ items completeert <1s
- [ ] AdminForm auto-generates van TypeScript interfaces
- [ ] Permission checks integreren met B08
- [ ] Mobile-responsive admin views

**Specify Prompt**:
```
/spec-kitty.specify feature=F14-admin-panel-components

[feature summary]
Reusable admin panel components for content management (users, organisations, projects).

[goals]
- AdminTable component: sortable, filterable, paginated, bulk actions
- AdminForm component: auto-generated from TypeScript interfaces
- AdminPanel layout: sidebar navigation, breadcrumbs
- BulkActions component: multi-select with actions
- QuickFilters component: predefined filter presets
- Integration with B08 permissions system

[non-goals]
- Custom admin dashboard builder
- Django Admin replacement
- Low-code form builder

[dependencies]
- F01 (@django-core/design-system)
- F02 (@django-core/auth)
- Backend: B05, B06, B07, B08

[scope]
Frontend package - React components, TypeScript, Storybook stories, tests
Demo page: /admin with users/orgs/projects management
```

---
## Notes
<!-- Add progress notes here -->

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
