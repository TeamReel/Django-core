# Q3 — Component Tests

**Status:** ✅ Done
**Effort:** 12 uur
**Scope:** +46 test files voor UI components (28→74 suites, 167→446 tests)

---

## Doel

Test coverage voor shared UI components. Focus op components die across de app gebruikt worden.

## Current State

- 28 test files total
- Focus was op hooks + API modules
- UI components: 0% coverage

## Priority Components

### Tier 1 — Core UI (used everywhere)

| Component | Usage | Test Focus |
|-----------|-------|------------|
| Modal | ~50 usages | Open/close, content render |
| Card | ~40 usages | Variants, children |
| DataTable | ~30 usages | Sorting, pagination, selection |
| PageHeader | ~25 usages | Title, actions, breadcrumbs |
| Toast | ~20 usages | Show/dismiss, variants |
| Avatar | ~20 usages | Image/fallback, sizes |
| Badge | ~15 usages | Variants, content |

### Tier 2 — Complex Components

| Component | Test Focus |
|-----------|------------|
| Wizard | Step navigation, validation |
| CreateWizard | Form state, submission |
| SplitView | Resize, responsive |
| Sidebar | Navigation, collapse |
| SearchBar | Query, suggestions |

### Tier 3 — Domain Components

| Component | Test Focus |
|-----------|------------|
| MemberList | List rendering, selection |
| MatchesList | Filtering, pagination |
| MediaAssetCard | Actions, states |
| ContentCard | Render variants |

## Test Pattern

```typescript
// ComponentName.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders with required props', () => {
    render(<ComponentName title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<ComponentName onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders variants correctly', () => {
    const { rerender } = render(<ComponentName variant="primary" />);
    expect(screen.getByTestId('component')).toHaveClass('primary');

    rerender(<ComponentName variant="secondary" />);
    expect(screen.getByTestId('component')).toHaveClass('secondary');
  });
});
```

## Verificatie

- [ ] 50+ new component test files
- [ ] Core UI components 100% covered
- [ ] Complex components have integration tests
- [ ] `npx vitest run` passing
- [ ] Coverage report shows improvement

## Acceptatiecriteria

Na Q3:
- **Test files:** 78+ (van 28)
- **UI component coverage:** 80%+
