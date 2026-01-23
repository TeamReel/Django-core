# Quick Start Guide: @django-core/resource-alerts

**Feature**: F05 Resource Display & Alerts
**Package**: `@django-core/resource-alerts`
**Version**: 1.0.0 (planned)
**Date**: 2025-12-12

## Overview

`@django-core/resource-alerts` provides React components for displaying resource usage, health status indicators, and alert messages. Built on top of `@django-core/design-system` (F01) with full accessibility support (WCAG 2.1 AA).

**Key Features**:
- 🎨 Seamless F01 design system integration
- ♿ WCAG 2.1 AA accessible (ARIA live regions, keyboard navigation)
- 💾 localStorage persistence for alert dismissal
- 📊 Resource usage visualization (progress bars)
- 🏥 Service health monitoring components
- 🎯 TypeScript-first with full type safety
- 📦 Tree-shakeable ESM bundle (<20KB gzipped)

---

## Installation

```bash
# Using pnpm (recommended for monorepo)
pnpm add @django-core/resource-alerts

# Using npm
npm install @django-core/resource-alerts

# Using yarn
yarn add @django-core/resource-alerts
```

**Peer Dependencies**:
- `react@^18.0.0`
- `react-dom@^18.0.0`
- `@django-core/design-system@^1.0.0` (required for tokens and styles)

---

## Basic Usage

### 1. Setup Theme Provider

Wrap your app with `ThemeProvider` from F01 design system:

```tsx
import { ThemeProvider } from '@django-core/design-system';
import '@django-core/design-system/tokens.css';

function App() {
  return (
    <ThemeProvider theme="light">
      {/* Your app content */}
    </ThemeProvider>
  );
}
```

### 2. Display an Alert

```tsx
import { Alert } from '@django-core/resource-alerts';

function MyComponent() {
  const [showAlert, setShowAlert] = useState(true);

  if (!showAlert) return null;

  return (
    <Alert
      severity="warning"
      title="Low API Credits"
      dismissible
      onDismiss={() => setShowAlert(false)}
    >
      You have 150 credits remaining. Upgrade your plan to avoid interruptions.
    </Alert>
  );
}
```

**Alert Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `severity` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Alert severity (determines color/icon) |
| `title` | `string` | - | Optional bold title |
| `dismissible` | `boolean` | `false` | Show dismiss button |
| `onDismiss` | `() => void` | - | Callback when dismissed |
| `children` | `ReactNode` | - | Alert message content |

### 3. Show Resource Usage

```tsx
import { ResourceUsageBar } from '@django-core/resource-alerts';

function CreditsDisplay() {
  const creditsUsed = 850;
  const creditsLimit = 1000;

  return (
    <ResourceUsageBar
      value={creditsUsed}
      max={creditsLimit}
      label="API Credits"
      unit="credits"
    />
  );
}
```

**ResourceUsageBar Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `number` | ✅ | Current usage amount |
| `max` | `number` | ✅ | Maximum limit/quota |
| `label` | `string` | ✅ | Resource name (e.g., "API Credits") |
| `unit` | `string` | - | Unit of measurement (e.g., "GB", "requests") |
| `showPercentage` | `boolean` | - | Display percentage instead of raw values |

**Color Logic** (automatic):
- 0-50%: Success (green)
- 50-80%: Warning (yellow)
- 80-100%: Error (red)

### 4. Display Health Status

```tsx
import { HealthStatus } from '@django-core/resource-alerts';

function ServiceMonitor() {
  return (
    <div>
      <HealthStatus name="Database" status="healthy" />
      <HealthStatus name="Cache" status="degraded" details="High memory usage" />
      <HealthStatus name="API" status="unhealthy" details="Connection timeout" />
    </div>
  );
}
```

**HealthStatus Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✅ | Service name (e.g., "PostgreSQL") |
| `status` | `'healthy' \| 'degraded' \| 'unhealthy' \| 'unknown'` | ✅ | Current health status |
| `details` | `string` | - | Optional additional context |
| `lastChecked` | `string` | - | ISO 8601 timestamp of last check |

---

## Advanced Usage

### Alert with localStorage Persistence

Use `useAlertDismissal` hook to persist dismissal state:

```tsx
import { Alert, useAlertDismissal } from '@django-core/resource-alerts';

function PersistentAlert() {
  const alertId = 'maintenance-notice-2025-12';
  const { isDismissed, dismiss, dismissForever } = useAlertDismissal(alertId);

  if (isDismissed) return null;

  return (
    <Alert
      severity="info"
      title="Scheduled Maintenance"
      dismissible
      onDismiss={dismiss}
    >
      <p>System maintenance scheduled for tonight at 2 AM UTC.</p>
      <button onClick={dismissForever}>Never show again</button>
    </Alert>
  );
}
```

**useAlertDismissal Hook**:
```typescript
function useAlertDismissal(alertId: string): {
  isDismissed: boolean;
  dismiss: () => void;
  dismissForever: () => void;
  reset: () => void;
}
```

### Compound ResourceCard

Use `ResourceCard` for complex layouts with multiple sections:

```tsx
import { ResourceCard, HealthStatus, ResourceUsageBar, Badge } from '@django-core/resource-alerts';

function ResourceDashboard() {
  return (
    <ResourceCard variant="default">
      <ResourceCard.Header>
        <HealthStatus name="API Service" status="healthy" />
        <Badge variant="success">Active</Badge>
      </ResourceCard.Header>

      <ResourceCard.Body>
        <ResourceUsageBar
          value={850}
          max={1000}
          label="API Credits"
          unit="requests"
        />
        <ResourceUsageBar
          value={2.4}
          max={10}
          label="Storage"
          unit="GB"
        />
      </ResourceCard.Body>

      <ResourceCard.Footer>
        <button>View Details</button>
        <button>Upgrade Plan</button>
      </ResourceCard.Footer>
    </ResourceCard>
  );
}
```

### Alert Stack (Multiple Alerts)

Display multiple alerts with automatic stacking:

```tsx
import { AlertStack, Alert } from '@django-core/resource-alerts';

function Notifications() {
  const alerts = [
    { id: '1', severity: 'error', message: 'Payment failed' },
    { id: '2', severity: 'warning', message: 'Low credits' },
    { id: '3', severity: 'success', message: 'Export complete' },
  ];

  return (
    <AlertStack position="top-right" maxVisible={5}>
      {alerts.map(alert => (
        <Alert key={alert.id} severity={alert.severity}>
          {alert.message}
        </Alert>
      ))}
    </AlertStack>
  );
}
```

### Fetching Data with Optional Hooks

F05 provides optional polling hooks for B11/B18 data:

```tsx
import { useResourceUsage, useHealthStatus } from '@django-core/resource-alerts';

function LiveMonitoring() {
  // Poll B11 API every 30 seconds
  const { data: credits, isLoading, error } = useResourceUsage({
    endpoint: '/api/billing/usage',
    pollInterval: 30000,
  });

  // Poll B18 API every 10 seconds
  const { data: health } = useHealthStatus({
    endpoint: '/api/health/status',
    pollInterval: 10000,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <div>
      <ResourceUsageBar
        value={credits.used}
        max={credits.limit}
        label="API Credits"
      />
      {health.services.map(service => (
        <HealthStatus key={service.id} {...service} />
      ))}
    </div>
  );
}
```

**Note**: Hooks are optional - you can also fetch data yourself and pass via props.

---

## Integration with B11 & B18

### B11 (Billing & Credits)

```tsx
// Fetch credit usage
const response = await fetch('/api/billing/usage');
const data: CreditUsageResponse = await response.json();

// Normalize for F05 components
import { normalizeCreditUsage } from '@django-core/resource-alerts/contracts/B11';

const resourceData = normalizeCreditUsage(data);

<ResourceUsageBar
  value={resourceData.value}
  max={resourceData.max}
  label={resourceData.label}
  unit={resourceData.unit}
/>
```

### B18 (Health Monitoring)

```tsx
// Fetch health status
const response = await fetch('/api/health/status');
const data: HealthStatusResponse = await response.json();

// Normalize for F05 components
import { normalizeServiceHealth } from '@django-core/resource-alerts/contracts/B18';

const dbHealth = normalizeServiceHealth(data.services[0]);

<HealthStatus
  name={dbHealth.name}
  status={dbHealth.status}
  details={dbHealth.details}
/>
```

**TypeScript Contracts**: See `contracts/B11-billing-credits.ts` and `contracts/B18-health-status.ts` for full API shapes.

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **ARIA Live Regions**: Alerts use `role="alert"` (error/warning) or `role="status"` (info/success)
- **Keyboard Navigation**: All interactive elements keyboard-accessible
- **Screen Reader Support**: Meaningful labels and announcements
- **Motion Preferences**: Respects `prefers-reduced-motion` (animations disabled automatically)
- **Color Contrast**: All text meets AA contrast ratios (4.5:1 minimum)

### Testing Accessibility

```tsx
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Alert } from '@django-core/resource-alerts';

test('Alert has no accessibility violations', async () => {
  const { container } = render(
    <Alert severity="error">Error message</Alert>
  );

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Styling & Theming

All components use F01 design tokens - **no custom CSS needed**:

```tsx
// Colors automatically adapt to theme
<ThemeProvider theme="dark">
  <Alert severity="warning">Dark theme alert</Alert>
</ThemeProvider>

<ThemeProvider theme="light">
  <Alert severity="warning">Light theme alert</Alert>
</ThemeProvider>
```

**Custom Styles** (if needed):
```tsx
import { Alert } from '@django-core/resource-alerts';

// Use className for custom spacing/layout only
<Alert severity="info" className="my-custom-spacing">
  Content
</Alert>
```

**Don't override colors/typography** - use F01 tokens to maintain consistency.

---

## Examples

See Storybook for interactive examples:

```bash
# Start Storybook
pnpm storybook

# Open http://localhost:6006
```

**Example Stories**:
- `Alert.stories.tsx` - All alert variants
- `ResourceUsageBar.stories.tsx` - Usage bars with different thresholds
- `HealthStatus.stories.tsx` - All health states
- `ResourceCard.stories.tsx` - Compound component examples
- `ResourceMonitoring.stories.tsx` - Complete monitoring dashboard pattern

---

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  AlertSeverity,
  HealthStatusType,
  ResourceUsageData,
  AlertPreference,
} from '@django-core/resource-alerts';

// Component prop types
import type { AlertProps, ResourceUsageBarProps, HealthStatusProps } from '@django-core/resource-alerts';

// API contract types
import type { CreditUsageResponse, HealthStatusResponse } from '@django-core/resource-alerts/contracts';
```

---

## Performance

- **Bundle Size**: <20KB gzipped (entire package)
- **Component Render**: <16ms (60fps)
- **Animations**: 200-300ms fade (configurable, respects `prefers-reduced-motion`)
- **Tree Shaking**: Import only what you need

```tsx
// ✅ Good: Only Alert bundled
import { Alert } from '@django-core/resource-alerts';

// ❌ Avoid: Imports everything
import * as ResourceAlerts from '@django-core/resource-alerts';
```

---

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Minimum Requirements**:
- ES2020 support
- localStorage API
- CSS Grid
- CSS Custom Properties

---

## Troubleshooting

### localStorage Not Working

**Issue**: Alert dismissal not persisted across page loads.

**Solution**: Check browser privacy settings (localStorage may be disabled in private browsing).

```typescript
// Check localStorage availability
if (typeof window !== 'undefined' && window.localStorage) {
  // localStorage available
} else {
  // Fallback: alerts always visible
}
```

### Colors Not Matching F01

**Issue**: Components don't match design system colors.

**Solution**: Ensure `ThemeProvider` wraps your app and `tokens.css` is imported:

```tsx
import { ThemeProvider } from '@django-core/design-system';
import '@django-core/design-system/tokens.css'; // ← Required

<ThemeProvider theme="light">
  <App />
</ThemeProvider>
```

### TypeScript Errors

**Issue**: Type errors with API responses.

**Solution**: Use provided TypeScript contracts:

```typescript
import type { CreditUsageResponse } from '@django-core/resource-alerts/contracts/B11';

const data: CreditUsageResponse = await fetch('/api/billing/usage').then(r => r.json());
```

---

## Next Steps

- 📖 Read full [Component API Documentation](./README.md)
- 🎨 Browse [Storybook Examples](http://localhost:6006)
- 🔧 See [Extension Guide](../docs/resource-alerts-extension-guide.md) for customization
- 🐛 Report issues on [GitHub](https://github.com/django-core/django-core/issues)

---

## Support

- **Documentation**: `packages/resource-display-alerts/README.md`
- **Storybook**: `http://localhost:6006`
- **Issues**: GitHub Issues
- **Discord**: #frontend-support channel
