# Fase 11: Frontend & Visual Dev

## 47. F13 – Rich Text Editor Component

**Doel**: WYSIWYG editor component met content sanitization en markdown support.

**Waarom agnostisch**: Rich text editing is universeel - comments, descriptions, documentation, blog posts.

**Wat moet er gebeuren**:
- TipTap/ProseMirror-based editor met WYSIWYG interface
- Customizable toolbar (formatting, lists, links, images, code, tables)
- Content sanitization (DOMPurify, XSS protection)
- Markdown bidirectional conversion (HTML  Markdown)
- Image handling via B22 (drag-and-drop upload)

**Demo Requirements**:
-  **Rich Text Page** (`/demo/editor`): Editor with toolbar  save/load  image upload  markdown toggle  preview mode
- Tests: type text  format  insert image  save  load  verify content

**Status**:  ROADMAP

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

[demo requirements]
Demo page: /demo/editor
- Editor with full toolbar
- Save/load functionality
- Image drag-and-drop upload
- Markdown view toggle
- Preview mode
- Tests: edit  format  insert image  save  load
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
