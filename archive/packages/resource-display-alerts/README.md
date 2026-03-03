# @django-core/resource-alerts

Resource usage display and alert components for django-core platform.

## Installation

```bash
pnpm add @django-core/resource-alerts @django-core/design-system
```

## Quick Start

```tsx
import { Alert, ResourceUsageBar } from '@django-core/resource-alerts';

function MyComponent() {
  return (
    <>
      <Alert title="Low Credits" severity="warning">
        You have 150 credits remaining.
      </Alert>

      <ResourceUsageBar
        value={850}
        max={1000}
        label="API Credits"
        unit="credits"
      />
    </>
  );
}
```

## Components

### Alert

Dismissible alert component with localStorage persistence.

**Props:**
- `title` (string, required): Alert title
- `severity` ('info' | 'success' | 'warning' | 'error'): Visual severity
- `children` (ReactNode): Alert message content
- `dismissible` (boolean): Show dismiss button
- `onClose` (function): Callback when dismissed

**Example:**
```tsx
import { Alert, useAlertDismissal } from '@django-core/resource-alerts';

function DismissibleAlert() {
  const { isVisible, dismiss, dismissForever } = useAlertDismissal({
    alertId: 'low-credits-warning',
  });

  if (!isVisible) return null;

  return (
    <Alert
      title="Low Credits"
      severity="warning"
      onClose={dismiss}
      actions={
        <button onClick={dismissForever}>Never show again</button>
      }
    >
      You have 150 credits remaining.
    </Alert>
  );
}
```

### ResourceUsageBar

Progress bar for resource usage with severity-based colors.

**Props:**
- `value` (number, required): Current usage
- `max` (number, required): Maximum capacity
- `label` (string): Optional label
- `unit` (string): Unit of measurement (e.g., "credits", "GB")
- `showPercentage` (boolean): Show percentage instead of value/max

**Example:**
```tsx
<ResourceUsageBar
  value={850}
  max={1000}
  label="API Credits"
  unit="credits"
/>
```

### HealthStatus

Service health indicator with color-coded status.

**Props:**
- `name` (string, required): Service name
- `status` ('healthy' | 'degraded' | 'unhealthy' | 'unknown', required): Health status
- `details` (string): Optional details or error message
- `lastChecked` (string): ISO 8601 timestamp
- `size` ('small' | 'medium' | 'large'): Size variant

**Example:**
```tsx
<HealthStatus
  name="Database"
  status="healthy"
  lastChecked={new Date().toISOString()}
/>
```

### Badge

Count badge with color variants.

**Props:**
- `children` (ReactNode, required): Badge content (usually number or text)
- `variant` ('neutral' | 'success' | 'warning' | 'error' | 'info'): Color variant
- `size` ('small' | 'medium' | 'large'): Size variant

**Example:**
```tsx
<Badge variant="error">5</Badge>
```

### ResourceCard (Compound Component)

Flexible card component for composing resource displays.

**Example:**
```tsx
import { ResourceCard, HealthStatus, ResourceUsageBar } from '@django-core/resource-alerts';

<ResourceCard variant="default">
  <ResourceCard.Header>
    <HealthStatus name="API Service" status="healthy" />
  </ResourceCard.Header>

  <ResourceCard.Body>
    <ResourceUsageBar value={850} max={1000} label="Credits" />
  </ResourceCard.Body>

  <ResourceCard.Footer>
    <button>View Details</button>
  </ResourceCard.Footer>
</ResourceCard>
```

### AlertStack

Manages multiple alerts with visibility limits.

**Props:**
- `children` (ReactNode, required): Alert components
- `position` ('inline' | 'top-center'): Positioning mode
- `maxVisible` (number): Max visible alerts (default: 5)
- `onViewAll` (function): Callback when "View all" clicked

**Example:**
```tsx
<AlertStack maxVisible={5}>
  <Alert title="Alert 1" severity="warning" />
  <Alert title="Alert 2" severity="info" />
  <Alert title="Alert 3" severity="error" />
</AlertStack>
```

## Hooks

### useAlertDismissal

Manages alert visibility with localStorage persistence.

**Returns:**
- `isVisible` (boolean): Whether alert should be shown
- `dismiss()` (function): Temporarily dismiss (until page reload)
- `dismissForever()` (function): Permanently dismiss (localStorage)
- `reset()` (function): Show alert again

**Example:** See Alert component example above.

### useResourceUsage (Optional)

Polls B11 API for credit usage data.

**Options:**
- `endpoint` (string, required): API endpoint
- `pollInterval` (number): Polling interval in ms (default: 30000)
- `enabled` (boolean): Enable polling (default: true)

**Returns:**
- `data` (CreditUsageResponse | null): Credit usage data
- `isLoading` (boolean): Loading state
- `error` (Error | null): Error state
- `refetch()` (function): Manually refresh data

**Example:**
```tsx
const { data, isLoading, error } = useResourceUsage({
  endpoint: '/api/billing/credits/usage',
});

if (isLoading) return <Spinner />;
if (error) return <Alert severity="error" title="Error" />;
if (!data) return null;

return <ResourceUsageBar value={data.used} max={data.limit} />;
```

### useHealthStatus (Optional)

Polls B18 API for service health data. Similar to useResourceUsage.

## Integration with Backend

### B11: Billing & Credits

This package includes TypeScript contracts for B11 API:

```tsx
import type { CreditUsageResponse } from '@django-core/resource-alerts/types/contracts/B11';

// Example API response
const creditData: CreditUsageResponse = {
  used: 850,
  limit: 1000,
  unit: 'credits',
  percentage: 85,
};
```

### B18: Health Monitoring

TypeScript contracts for B18 health API:

```tsx
import type { HealthStatusResponse } from '@django-core/resource-alerts/types/contracts/B18';

const healthData: HealthStatusResponse = {
  services: [
    { name: 'Database', status: 'healthy' },
    { name: 'API Server', status: 'degraded' },
  ],
};
```

## Accessibility

This package meets WCAG 2.1 AA standards:

- **Keyboard navigation**: All interactive elements accessible via Tab/Enter/Escape
- **Screen reader support**: ARIA labels, live regions, and roles
- **Color contrast**: All text meets 4.5:1 ratio
- **Motion sensitivity**: Animations respect `prefers-reduced-motion`

## Troubleshooting

### localStorage unavailable

Components gracefully degrade if localStorage is unavailable (e.g., private browsing):

```tsx
// Still dismissible, just no persistence
<Alert title="Warning" dismissible />
```

### TypeScript errors

Ensure you have `@django-core/design-system` installed as peer dependency:

```bash
pnpm add @django-core/design-system
```

### Bundle size issues

This package is tree-shakeable. Import only what you need:

```tsx
// Good: Only imports Alert
import { Alert } from '@django-core/resource-alerts';

// Bad: Imports entire package
import * as ResourceAlerts from '@django-core/resource-alerts';
```

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

## Development

### Build

```bash
pnpm build
```

Generates ESM and CJS outputs in `dist/` with TypeScript declarations.

### Test

```bash
pnpm test          # Run tests once
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage report
```

### Storybook

```bash
pnpm storybook
```

Launches Storybook on http://localhost:6006

### Type Checking

```bash
pnpm typecheck
```

## Scripts

- `pnpm build` - Build library for production
- `pnpm dev` - Start Vite dev server
- `pnpm test` - Run unit tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate coverage report
- `pnpm storybook` - Launch Storybook
- `pnpm build-storybook` - Build Storybook for deployment
- `pnpm lint` - Lint source files
- `pnpm typecheck` - Type check without emitting files

## Package Structure

```
packages/resource-display-alerts/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions & contracts
│   ├── utils/          # Utility functions (localStorage, etc.)
│   └── index.ts        # Main entry point
├── stories/            # Storybook stories
├── tests/              # Test utilities and setup
├── .storybook/         # Storybook configuration
└── dist/               # Build output (generated)
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup.

## License

MIT
