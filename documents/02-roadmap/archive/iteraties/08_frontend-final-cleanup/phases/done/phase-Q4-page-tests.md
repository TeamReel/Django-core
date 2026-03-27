# Q4 — Page Tests

**Status:** 🔲 Todo
**Effort:** 12 uur
**Scope:** +50 test files voor page components

---

## Doel

Integration tests voor page components. Test de volledige user flow per pagina.

## Current State

- 28 test files total
- No page-level tests
- Need E2E-style tests with mocked API

## Test Strategy

Pages zijn complexer dan components:
1. **Data loading** — API calls via mocked fetch
2. **User interactions** — Click, type, navigate
3. **State management** — Local state + context
4. **Error handling** — Error states + recovery

## Priority Pages

### Tier 1 — Core Pages

| Page | Test Focus |
|------|------------|
| OrganisationsPage | List, filter, create org |
| ProjectsPage | Hierarchy, create project |
| SeasonDetailPage | Tabs, data loading |
| MatchDetailPage | Match data, lineup, content |
| UsersPage | User list, filters, edit |

### Tier 2 — Feature Pages

| Page | Test Focus |
|------|------------|
| MediaLibraryPage | Grid, upload, select |
| ContentLibraryPage | Templates, generation |
| ApprovalsPage | Workflow, approve/reject |
| AIStudioPage | Canvas, generation |

### Tier 3 — Config Pages

| Page | Test Focus |
|------|------------|
| PreferencesPage | Settings, save |
| CreditsPage | Balance, history |
| AuditLogPage | Log entries, filter |

## Test Pattern

```typescript
// MyPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MyPage } from './MyPage';
import { mockApiResponse } from '@/test/api-mock';

const wrapper = ({ children }) => (
  <MemoryRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </MemoryRouter>
);

describe('MyPage', () => {
  beforeEach(() => {
    mockApiResponse('/api/items/', { results: mockItems });
  });

  it('loads and displays data', async () => {
    render(<MyPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  it('handles create action', async () => {
    render(<MyPage />, { wrapper });

    await userEvent.click(screen.getByText('Create'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockApiResponse('/api/items/', null, 500);
    render(<MyPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Test Utilities Needed

```typescript
// test/page-utils.tsx
export const renderPage = (Page: React.ComponentType, route = '/') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders>
        <Page />
      </AppProviders>
    </MemoryRouter>
  );
};
```

## Verificatie

- [ ] 50+ new page test files
- [ ] Core pages have integration tests
- [ ] Error states tested
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na Q4:
- **Test files:** 128+ (van 78)
- **Page coverage:** 80%+
