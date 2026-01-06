# F01: Design System

## 1. Purpose & Responsibility
The **Design System** is the visual foundation for all frontend interfaces. It provides reusable components, design tokens, and theming infrastructure.

**Responsibilities:**
*   **Design Tokens:** Colors, typography, spacing (CSS variables).
*   **UI Components:** Buttons, Inputs, Modals (React).
*   **Theming:** Light/Dark mode and brand variants.
*   **Accessibility:** WCAG AA compliance out of the box.

## 2. Domain-Agnostic Rationale
Design systems ensure visual consistency across apps. Instead of building "a blue button" 30 times, we build it once and reuse it. This is the **F01** layer that all other frontend modules consume.

## 3. Key Concepts

### 3.1 Design Tokens (`src/tokens/`)
CSS Custom Properties for themeable values:
```css
--color-primary: #0066cc;
--spacing-md: 16px;
```

### 3.2 Components (`src/components/`)
Atomic React components:
*   `<Button variant="primary" />`
*   `<Input label="Email" />`
*   `<Card>...</Card>`

### 3.3 Theme System (`src/theme/`)
Switcher logic for Light/Dark modes and brand overrides.

## 4. Public Interfaces (Exports)

**Package:** `@django-core/design-system`

```typescript
import { Button, Input, Card } from '@django-core/design-system';
import '@django-core/design-system/tokens.css';
```

## 5. Integrations & Dependencies
*   **Consumed By:** All frontend packages (`auth`, `context-switcher`, etc.).
*   **Built With:** React 18, TypeScript, Vite.

## 6. Status & Phase History
*   **Phase:** 6 (Frontend Foundations)
*   **Status:** ✅ Complete
*   **Source Code:** `packages/design-system/`
