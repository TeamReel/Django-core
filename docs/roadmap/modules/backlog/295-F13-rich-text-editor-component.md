# 295 — F13 — Rich Text Editor Component

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Frontend (UI Components) |
| Impact | 🟢 nice-to-have |
| Effort | ~20 uur |

## Wat

WYSIWYG rich text editor component gebaseerd op TipTap/ProseMirror met content sanitization (XSS-bescherming), bidirectionele Markdown conversie, customizable toolbar, en image upload via het bestaande file systeem.

## Waarom belangrijk

Zodra clubs beschrijvingen, notities of social captions willen bewerken, is een platte textarea onvoldoende. Een rich text editor maakt formatted content mogelijk zonder dat gebruikers Markdown hoeven te kennen. Content sanitization is cruciaal om XSS-aanvallen te voorkomen bij user-generated content.

## Past in TeamReel / CoreApp

- **TeamReel**: Social media captions, wedstrijdbeschrijvingen, en teamnotities profiteren van rich text. Clubs willen bold, links, en emoji in hun content.
- **CoreApp**: Rich text editing is een universeel UI-component — elk product met user-generated text content heeft dit nodig. TipTap is lightweight en extensible.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=F13-rich-text-editor

We bouwen een WYSIWYG editor component voor de React 18 + TypeScript frontend.

[feature summary]
TipTap-gebaseerde rich text editor met content sanitization, Markdown support, en image uploads.

[goals]
- TipTap/ProseMirror-based WYSIWYG editor
- Customizable toolbar (bold, italic, lists, links, images, code blocks)
- Content sanitization via DOMPurify (XSS bescherming)
- Bidirectionele HTML ↔ Markdown conversie
- Image upload via bestaand file systeem (drag-and-drop)
- Accessibility: keyboard navigation, ARIA labels

[non-goals]
- Real-time collaborative editing (Google Docs-style)
- Table editing
- Custom block types (embeds, widgets)

[tech context]
- Frontend: React 18, TypeScript, Vite, CSS Modules
- Editor: @tiptap/react + @tiptap/starter-kit
- Sanitization: dompurify
- Markdown: @tiptap/extension-markdown of turndown/showdown
- File uploads: bestaande file upload API (src/files/)
```

### Plan

```
/spec-kitty.plan feature=F13-rich-text-editor

[tech choices]
- Editor: @tiptap/react (ProseMirror wrapper, tree-shakeable extensions)
- Extensions: StarterKit + Link + Image + Markdown + Placeholder
- Sanitization: dompurify op output (nooit unsanitized HTML opslaan)
- Markdown: turndown (HTML→MD) + showdown (MD→HTML)
- Styling: CSS Modules met design tokens

[components to build]
- RichTextEditor — main component met TipTap instance
- EditorToolbar — customizable toolbar met button groups
- EditorContent — styled content area
- MarkdownToggle — switch tussen WYSIWYG en Markdown view

[files to create]
- demo/src/components/editor/RichTextEditor.tsx + .module.css
- demo/src/components/editor/EditorToolbar.tsx + .module.css
- demo/src/components/editor/MarkdownToggle.tsx
- demo/src/hooks/useRichTextEditor.ts — TipTap hook wrapper
```

### Research

```
/spec-kitty.research feature=F13-rich-text-editor

Onderzoek de volgende punten:

1. Zijn er al tekst-invoer componenten in demo/src/components/? Welke pattern wordt gebruikt?
2. Welke content types in de backend bevatten rich text velden? Check models voor TextField/HTMLField.
3. Wat is de bundle size impact van @tiptap/react + starter-kit? Past dit binnen de performance budgets?
4. Hoe werkt het bestaande file upload systeem (src/files/)? Welke API endpoints?
5. Worden er al DOMPurify of andere sanitization libraries gebruikt?
```
