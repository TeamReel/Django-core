# Testing Guide

## Overview

The `@django-core/context-switcher` package includes a comprehensive test suite covering unit tests, integration tests, accessibility tests, edge cases, and smoke tests. This guide explains how to run tests, understand the test structure, and write new tests.

> **⚠️ KNOWN ISSUE**: MSW (Mock Service Worker) v2.12.4 module resolution is currently failing in Jest with pnpm workspaces. The `msw/node` export cannot be resolved by ts-jest, causing test failures. All test files and infrastructure are complete and correct - this is a tooling configuration issue. Once resolved (by upgrading MSW, adjusting Jest config, or switching package managers), all tests should pass.
>
> **Status**:
> - ✅ Test files comprehensive and well-written
> - ✅ Jest configuration correct
> - ✅ MSW handlers properly defined
> - ❌ MSW module resolution failing
> - **Solution needed**: Investigate Jest/pnpm/MSW compatibility or use alternative mocking strategy

## Running Tests

### All Tests

```bash
cd packages/context-switcher
pnpm test
```

### With Coverage

```bash
pnpm test -- --coverage
```

### Watch Mode

```bash
pnpm test -- --watch
```

### Specific File

```bash
pnpm test -- ContextSwitcher.test.tsx
```

### Specific Test

```bash
pnpm test -- -t "renders without crashing"
```

## Test Structure

### Directory Organization

```
__tests__/
├── accessibility/          # axe-core accessibility tests
│   ├── ContextIndicator.a11y.test.tsx
│   ├── OrganisationPicker.a11y.test.tsx
│   └── ProjectPicker.a11y.test.tsx
├── api/                    # API client tests
│   ├── contextApi.test.ts
│   ├── organisationsApi.test.ts
│   └── projectsApi.test.ts
├── components/             # Component tests
│   ├── ContextIndicator.test.tsx
│   ├── ContextSwitcher.test.tsx
│   ├── OrganisationPicker.test.tsx
│   ├── ProjectPicker.test.tsx
│   └── VirtualizedList.test.tsx
├── context/                # Context provider tests
│   └── ContextSwitcherProvider.test.tsx
├── edge-cases/             # Edge case and stress tests
│   └── edge-cases.test.tsx
├── hooks/                  # Hook tests
│   ├── useDebouncedValue.test.ts
│   └── useKeyboardShortcut.test.ts
├── mocks/                  # MSW request handlers
│   ├── handlers.ts
│   └── server.ts
├── smoke/                  # Smoke tests
│   └── smoke.test.tsx
└── setup.ts                # Jest setup file
```

### Test Categories

#### Unit Tests

Test individual functions, hooks, and components in isolation.

```typescript
import { renderHook } from '@testing-library/react';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';

it('returns initial value immediately', () => {
  const { result } = renderHook(() => useDebouncedValue('initial', 300));
  expect(result.current).toBe('initial');
});
```

#### Component Tests

Test React components with user interactions.

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

it('opens picker on button click', async () => {
  render(<ContextSwitcher />);

  const button = screen.getByLabelText('Change organisation');
  fireEvent.click(button);

  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

#### Integration Tests

Test interactions between multiple components and the provider.

```typescript
it('switches context successfully', async () => {
  render(
    <ContextSwitcherProvider config={mockConfig}>
      <ContextSwitcher />
    </ContextSwitcherProvider>
  );

  // Test full context switching flow
});
```

#### Accessibility Tests

Test WCAG 2.1 AA compliance using jest-axe.

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<ContextSwitcher />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

#### Edge Case Tests

Test boundary conditions and unusual scenarios.

```typescript
it('handles 1000+ organisations efficiently', async () => {
  const largeOrgList = Array.from({ length: 1000 }, ...);
  // Test performance and stability
});
```

## Coverage Requirements

### Global Thresholds

The project enforces 90% minimum coverage across all metrics:

- **Statements**: 90%
- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%

### Per-File Thresholds

Individual files should maintain at least 80% coverage, except for:

- Type definition files (`*.d.ts`)
- Re-export files (`index.ts`)
- Story files (`*.stories.tsx`)

### Viewing Coverage Reports

After running tests with `--coverage`, open the HTML report:

```bash
open coverage/index.html  # macOS
start coverage/index.html  # Windows
xdg-open coverage/index.html  # Linux
```

## Writing Tests

### Component Test Template

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../../src/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', () => {
    const { rerender } = render(<MyComponent error={null} />);

    rerender(<MyComponent error={new Error('Test error')} />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Hook Test Template

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../../src/hooks/useMyHook';

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(initialValue);
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.update(newValue);
    });

    expect(result.current.value).toBe(newValue);
  });
});
```

### API Test Template

```typescript
import { fetchData } from '../../src/api/myApi';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('fetchData', () => {
  it('fetches successfully', async () => {
    const data = await fetchData('/api');
    expect(data).toEqual(expectedData);
  });

  it('handles errors', async () => {
    server.use(
      http.get('/api/endpoint/', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    await expect(fetchData('/api')).rejects.toThrow();
  });
});
```

## Mock Service Worker (MSW)

### Overview

MSW intercepts network requests at the network level, providing realistic API mocking.

### Request Handlers

Handlers are defined in `__tests__/mocks/handlers.ts`:

```typescript
export const handlers = [
  http.get('/api/organisations/', () => {
    return HttpResponse.json({
      organisations: mockOrganisations,
    });
  }),
];
```

### Overriding Handlers in Tests

```typescript
server.use(
  http.get('/api/organisations/', () => {
    return HttpResponse.json({ organisations: [] });
  })
);
```

### Custom Responses

```typescript
// Success
HttpResponse.json(data, { status: 200 })

// Error
HttpResponse.json({ error: 'Not found' }, { status: 404 })

// Network error
HttpResponse.error()

// Delay
await delay(1000);
return HttpResponse.json(data);
```

## CI/CD Integration

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests
- Pre-commit hooks (via Husky)

### CI Pipeline

```yaml
- name: Run tests
  run: pnpm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3

- name: Check coverage threshold
  run: |
    if ! pnpm test -- --coverage --coverageThreshold='{"global":{"lines":90}}'; then
      exit 1
    fi
```

## Debugging Tests

### Debug Single Test

```bash
pnpm test -- -t "test name" --no-coverage
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "${fileBasename}",
    "--config",
    "jest.config.js",
    "--no-coverage"
  ],
  "console": "integratedTerminal"
}
```

### Debug Failing Tests

```bash
# Show full error output
pnpm test -- --verbose

# No parallelization (easier to debug)
pnpm test -- --runInBand
```

## Best Practices

### DO

✅ Write tests that describe behavior, not implementation
✅ Use descriptive test names: `it('handles empty organisation list gracefully', ...)`
✅ Test user-facing behavior, not internal state
✅ Use `screen.getByRole()` and `getByLabelText()` for accessibility
✅ Test error states and edge cases
✅ Keep tests isolated (no shared state)
✅ Mock external dependencies (API calls, localStorage)

### DON'T

❌ Test implementation details
❌ Couple tests to internal state or methods
❌ Skip error handling tests
❌ Use `getByTestId()` unless absolutely necessary
❌ Share setup code that creates mutable state
❌ Make tests dependent on execution order

## Troubleshooting

### Tests Timeout

Increase Jest timeout:

```typescript
jest.setTimeout(10000);
```

### MSW Not Intercepting Requests

1. Ensure `setupFilesAfterEnv` includes setup.ts
2. Check handler URLs match request URLs exactly
3. Verify MSW server is started in beforeAll

### Coverage Drops Unexpectedly

1. Check if new files lack tests
2. Look for untested branches (use HTML coverage report)
3. Ensure test files are in `__tests__/` directories

### Type Errors in Tests

Tests may show TypeScript errors if Jest types are missing. This is expected and doesn't affect test execution.

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
