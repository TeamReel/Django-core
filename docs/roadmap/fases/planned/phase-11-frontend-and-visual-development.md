# Phase 11: Frontend & Visual Development (248-250)

**Focus**: Frontend components - data visualization, design-to-code pipeline, rich text editor

---

## [F08: Data Visualization Components](../modules/backlog/248-F08-data-visualization-components/index.md)

**Goal**: Herbruikbare visualisatie componenten (charts, graphs, metrics cards) voor dashboards.

**Waarom agnostisch**: Data visualization is universeel - analytics, reporting, monitoring dashboards.

**Wat moet er gebeuren**:
- **Chart components**: Line, Bar, Pie, Donut, Area charts
  - Library: recharts (React-friendly) of Chart.js
  - Props: `data`, `xKey`, `yKey`, `colors`, `legend`
  - Responsive (adapts to container width)
- **Metric cards**: KPI display met trend indicators
  - Components: `MetricCard`, `TrendIndicator`
  - Props: `value`, `label`, `trend` (up/down/flat), `change` (percentage)
  - Color coding (green = up, red = down)
- **Data tables**: Sortable, filterable tables
  - Library: TanStack Table (formerly React Table)
  - Features: sorting, filtering, pagination, column resize
  - Props: `data`, `columns`, `onRowClick`
- **Dashboard layouts**: Grid system voor composing dashboards
  - Components: `DashboardGrid`, `DashboardCard`
  - Responsive grid (1 col mobile, 2-3 cols desktop)
  - Drag-and-drop rearrange (optional, future)
- **Integration**: Uses F01 design system tokens
  - Chart colors from F01 color palette
  - Typography from F01 scale
  - Spacing from F01 system
- **Real-time updates**: Compatible met B23 WebSocket voor live data
  - Charts update automatically when new data arrives
  - No full page refresh needed

**Demo Requirements**:
- 📊 **Visualization Showcase** (`/demo/visualizations`):
  - Chart gallery: all chart types met sample data
    - Line chart (credits usage over time)
    - Bar chart (projects per org)
    - Pie chart (users by role)
    - Area chart (API requests over time)
  - Interactive: hover tooltips, zoom, filter
  - Metric cards: revenue, active users, conversion rate, credit balance
  - Data table: organisations list (sortable, filterable)
  - Responsive layouts (test mobile, tablet, desktop)
  - Tests: render charts → verify data → test interactions (hover, click)

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=F08-data-visualization-components

[feature summary]
Provide reusable data visualization components (charts, metrics, tables) built on F01 design system.

[goals]
- Chart components: Line, Bar, Pie, Area, Donut
- Metric cards with trend indicators
- Interactive data tables
- Dashboard composition patterns
- Real-time data updates via B23

[demo requirements]
Demo page: /demo/visualizations
- Chart gallery: all types with sample data
- Metric cards: KPI display with trends
- Interactive features: hover, zoom, filter
- Responsive layouts
- Tests: render → verify data → test interactions
```

---

## [F09: Design-to-Code Pipeline (Visily.ai Integration)](../modules/backlog/249-F09-design-to-code-pipeline-(visily.ai-integration)/index.md)

**Goal**: Pipeline om Visily.ai design exports te converteren naar werkende React components met F01 design system.

**Waarom nu in Phase 10**: Strategic - design-to-code capability available zodra demo-shell ready is, so that alle Next modules visueel can be designed met Visily before they are built.

**Waarom agnostisch**: Design-to-code workflow is universeel - designers create UI → developers implement faster.

**Wat moet er gebeuren**:
- **Visily parser**: Parse Visily export (JSON/Figma format)
  - Support Visily JSON export format
  - Extract layers, elements, styles, layout
- **Component mapper**: Map Visily elements → F01 components
  - Rectangle → `Box` component
  - Text → `Text` component
  - Button → `Button` component
  - Input → `Input` component
  - Card → `Card` component
  - Custom rules for complex patterns
- **Code generator**: Generate React component code met F01 imports
  - Output TypeScript (.tsx files)
  - Proper imports (`import { Button } from '@django-core/design-system'`)
  - Clean, readable code (formatted with Prettier)
- **Preview mode**: Live preview van gegenereerde component
  - Side-by-side view (design vs generated)
  - Hot reload on code changes
- **Manual refinement**: Developers can tweak generated code
  - Edit code in browser
  - Save to file
  - Re-import to Visily (optional, future)
- **Integration**: CLI tool + web UI in demo-shell
  - CLI: `pnpm generate-component --input design.json --output Component.tsx`
  - Web UI: `/demo/design-to-code` page

**Demo Requirements**:
- 🎨 **Design-to-Code Page** (`/demo/design-to-code`):
  - Upload Visily export (JSON file)
  - Preview original design (image or interactive preview)
  - Generate code button → shows React component code
  - Live preview (renders component in iframe)
  - Download code or copy to clipboard
  - Save to project (optional)
  - Tests: upload design → generate → preview → verify match

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=F09-design-to-code-pipeline-visily

[feature summary]
Design-to-code pipeline converting Visily.ai exports to React components using F01 design system.

[goals]
- Parse Visily export format
- Map design → F01 components
- Generate clean React/TypeScript code
- Live preview
- CLI + web UI

[pipeline steps]
1. Parse Visily JSON
2. Build element tree
3. Map to F01 components (Rectangle→Box, Text→Text, Button→Button, etc.)
4. Generate React/TypeScript code
5. Apply F01 design tokens
6. Output: .tsx file

[demo requirements]
Demo page: /demo/design-to-code
- Upload Visily export.json
- Original design preview
- Generate button → React code
- Live preview (side-by-side)
- Copy/download/save actions
- Tests: upload → generate → preview → verify match
```

---

## [F13: Rich Text Editor Component](../modules/backlog/250-F13-rich-text-editor-component/index.md)

**Goal**: WYSIWYG editor component met content sanitization en markdown support.

**Waarom agnostisch**: Rich text editing is universeel - comments, descriptions, documentation, blog posts.

**Wat moet er gebeuren**:
- **Editor library**: TipTap (React-friendly, extensible) of ProseMirror
  - WYSIWYG interface (bold, italic, underline, headings, lists)
  - Markdown shortcuts (e.g., `**bold**` → bold)
  - Slash commands (e.g., `/heading` → insert heading)
- **Toolbar**: Customizable toolbar met common actions
  - Text formatting (bold, italic, underline, strikethrough)
  - Headings (H1-H6)
  - Lists (bullet, numbered, checklist)
  - Links (insert, edit, remove)
  - Images (upload via B22, embed URL)
  - Code blocks (syntax highlighting)
  - Tables (insert, resize, delete)
- **Content sanitization**: XSS protection
  - Sanitize HTML output (DOMPurify)
  - Whitelist allowed tags (p, strong, em, a, img, code, etc.)
  - Strip dangerous attributes (onclick, onerror)
- **Markdown support**: Bidirectional conversion
  - HTML ↔ Markdown conversion
  - Export as Markdown (for API storage)
  - Import Markdown (for editing)
- **Image handling**: Integration met B22 file management
  - Drag-and-drop image upload
  - Progress indicator
  - Thumbnail in editor
  - Full-size on click
- **Collaboration** (optional, future): Real-time collaborative editing via B23
  - Cursor presence
  - Live updates
  - Conflict resolution

**Demo Requirements**:
- ✍️ **Rich Text Page** (`/demo/editor`):
  - Editor with toolbar (all formatting options)
  - Save button (stores content to backend)
  - Load button (loads saved content)
  - Image upload via drag-and-drop (uses B22)
  - Markdown view toggle (show HTML vs Markdown)
  - Preview mode (read-only rendered view)
  - Tests: type text → format → insert image → save → load → verify content

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=F13-rich-text-editor

[feature summary]
WYSIWYG rich text editor with content sanitization, markdown support, and image uploads.

[goals]
- TipTap/ProseMirror-based editor
- Customizable toolbar (formatting, lists, links, images)
- Content sanitization (XSS protection)
- Markdown bidirectional conversion
- Image uploads via B22

[toolbar features]
- Text: bold, italic, underline, strikethrough
- Headings: H1-H6
- Lists: bullet, numbered, checklist
- Links: insert, edit, remove
- Images: upload (B22), embed URL
- Code: inline, blocks (syntax highlighting)
- Tables: insert, resize, delete

[demo requirements]
Demo page: /demo/editor
- Editor with full toolbar
- Save/load functionality
- Image drag-and-drop upload
- Markdown view toggle
- Preview mode
- Tests: edit → format → insert image → save → load
```

---

## 📋 Constitution Gate (Post Frontend & Visual Dev)

**Timing**: Na Phase 10 (modules 039-041 Complete)

**Waarom nu**:
- **Demo app is Complete** (F10 + F10b pages voor alle modules 001-030)
- **Backend infrastructure operational** (B22-B25: files, real-time, search, cache)
- **Frontend visualization ready** (F08 charts, F09 design-to-code, F13 editor)
- **Visual development workflow** available (Visily → code generator)

Voor modules 041+ (workflows, payments, documents, data foundations), moeten governance principes helder zijn:
- **Visual-first development**: All new UI designed in Visily first → generate → refine
- **Performance baselines**: Cache patterns mandatory (B25) voor data-intensive features
- **Real-time patterns**: WebSocket authentication + rate limiting mandatory (B23)
- **File security**: Upload validation, virus scanning, tenant isolation (B22)

**Constitution Updates Needed**:

1. **Visual-First Development** (Section 7):
   - All new UI components (modules 041+) MUST be designed in Visily first
   - Use F09 pipeline to generate initial code
   - Refine generated code (no copy-paste from other projects)
   - Design files MUST be versioned (Visily project per module)

2. **Cache Strategy** (Section 6):
   - All expensive queries (>100ms) MUST use B25 cache decorators
   - TTL MUST be appropriate (5min dev, 1h prod)
   - Invalidation MUST occur on mutations (POST/PUT/DELETE)
   - Cache keys MUST include tenant scope (no cross-org leaks)

3. **Real-time Security** (Section 8):
   - All WebSocket connections MUST authenticate via JWT (B23)
   - Rate limiting MUST be enforced (100 messages/minute)
   - Broadcast MUST respect permissions (no leaking private data)
   - Heartbeat MUST be sent every 30s (detect dead connections)

4. **File Security** (Section 8):
   - All file uploads MUST validate MIME type + size (B22)
   - Virus scanning MUST be enabled (ClamAV, async via B15)
   - Presigned URLs MUST expire (1h for downloads)
   - File access MUST respect B08 permissions (tenant-scoped)

5. **Search Permissions** (Section 8):
   - All search results MUST be filtered via B08 (no leaking)
   - Search queries MUST be audited (B09 log)
   - Search MUST support permissions (org membership, project access)
   - Search performance MUST be <200ms (PostgreSQL FTS + cache)

6. **Data Visualization** (Section 6):
   - All charts MUST use F08 components (no custom charting libs)
   - Chart data MUST respect permissions (no cross-org leaks)
   - Charts MUST handle empty state (no crashes on zero data)
   - Charts MUST be responsive (mobile, tablet, desktop)

---

**Phase 11 Complete**: 3 modules (F08, F09, F13)
**Next**: Phase 12 - Workflows & Payments (B36, B37, B38)
