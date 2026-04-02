# Fase 10: Content Engine Core

## 42. B33 – Brand Identity Manager

**Doel**: Centralized brand identity management - logos, colors, design tokens als data (niet hardcoded), ondersteunt white-labeling en AI-driven content generation.

**Waarom agnostisch**: Brand identity is universeel - corporate branding, team colors, product styles, marketing themes.

**Wat moet er gebeuren**:
- **BrandProfile model**: Brand configuration per organisation/project
  - Fields: name, is_active
  - Foreign keys: organisation, project (optional)
  - Inheritance: project can inherit org brand or override
- **DesignToken model**: Style values as data
  - Fields: key, value, type (color/font/spacing)
  - Examples: primary_color=#FF0000, font_heading=Roboto, border_radius=8px
- **BrandAsset model**: Logo and visual files
  - Fields: asset_type (logo/watermark/font)
  - Foreign keys: profile, file (B22)
  - Types: logo_light, logo_dark, watermark
- **Token API**: Frontend consumption
  - Endpoint returns complete token set
  - Frontend applies styles dynamically
- **Integration**: B22 (file storage), B34 (AI uses brand tokens), B06/B07 (org/project)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)
- No frontend/demo page required per Constitution
- Frontend integration is downstream product responsibility

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B33-brand-identity-manager

[feature summary]
Centralized brand identity management - design tokens and assets as data.

[goals]
- BrandProfile model (per org/project)
- DesignToken model (key-value pairs)
- BrandAsset model (logos, watermarks)
- Inheritance (project inherits org brand)
- Token API (frontend consumption)
- Integration (B22 files, B34 AI, B06/B07)

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```
