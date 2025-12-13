# @django-core/page-templates

Production-ready, accessible page templates for modern React applications. Build consistent user interfaces faster with pre-built Dashboard, List-Detail, Wizard, and Settings templates.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![Bundle Size](https://img.shields.io/badge/Bundle-<15KB_gzipped-green)](https://bundlephobia.com)
[![Tests](https://img.shields.io/badge/Tests-124%2F124_passing-green)](./tests)
[![Chromatic](https://img.shields.io/badge/Chromatic-Visual_Testing-orange)](https://www.chromatic.com/)

## Features

- ✅ **4 Production Templates**: Dashboard, List-Detail, Wizard, Settings
- ✅ **TypeScript First**: 100% type coverage with strict mode
- ✅ **Accessible by Default**: WCAG 2.1 AA compliant
- ✅ **Responsive**: Mobile-first design that adapts to all screen sizes
- ✅ **State Management**: Support for loading, error, empty, and permission-denied states
- ✅ **Customizable**: Override any state with custom render props
- ✅ **Lightweight**: <15KB gzipped
- ✅ **Zero Runtime CSS**: Works with any styling solution

## Installation

```bash
npm install @django-core/page-templates
# or
pnpm add @django-core/page-templates
# or
yarn add @django-core/page-templates
```

### Peer Dependencies

```bash
npm install react react-dom @django-core/design-system @django-core/layouts
```

## Quick Start

### Dashboard Template

Perfect for analytics, metrics, and overview pages.

```tsx
import { Dashboard } from '@django-core/page-templates';

function AnalyticsDashboard() {
  return (
    <Dashboard loading={isLoading} error={error}>
      <Dashboard.Header
        title="Analytics"
        subtitle="Track your key metrics"
        actions={<RefreshButton />}
      />

      <Dashboard.FilterBar>
        <DateRangePicker />
        <RegionSelector />
      </Dashboard.FilterBar>

      <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <MetricCard title="Revenue" value="$45,231" />
        <MetricCard title="Users" value="1,234" />
        <MetricCard title="Conversion" value="12.5%" />
        <MetricCard title="AOV" value="$36.70" />
      </Dashboard.Grid>
    </Dashboard>
  );
}
```

### List-Detail Template

Ideal for browsing collections with detail views (emails, projects, files).

```tsx
import { ListDetail } from '@django-core/page-templates';

function ProjectBrowser() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ListDetail
      selectedId={selectedId}
      onSelectedIdChange={setSelectedId}
    >
      <ListDetail.List showSearch onSearchChange={handleSearch}>
        {projects.map(project => (
          <ProjectListItem key={project.id} project={project} />
        ))}
      </ListDetail.List>

      <ListDetail.Detail>
        {selectedProject && <ProjectDetails project={selectedProject} />}
      </ListDetail.Detail>
    </ListDetail>
  );
}
```

### Wizard Template

Multi-step flows, onboarding, checkout, or configuration wizards.

```tsx
import { Wizard } from '@django-core/page-templates';

const steps = [
  { id: 'account', label: 'Account' },
  { id: 'profile', label: 'Profile' },
  { id: 'review', label: 'Review' },
];

function OnboardingWizard() {
  return (
    <Wizard
      steps={steps}
      onComplete={handleComplete}
      onCancel={handleCancel}
    >
      <Wizard.Step stepId="account">
        <AccountForm />
      </Wizard.Step>
      <Wizard.Step stepId="profile">
        <ProfileForm />
      </Wizard.Step>
      <Wizard.Step stepId="review">
        <ReviewSummary />
      </Wizard.Step>
    </Wizard>
  );
}
```

### Settings Template

User preferences, configuration panels, admin settings.

```tsx
import { Settings } from '@django-core/page-templates';

const sections = [
  { id: 'general', label: 'General' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
];

function UserSettings() {
  return (
    <Settings sections={sections}>
      <Settings.Section sectionId="general" title="General Settings">
        <GeneralSettingsForm />
      </Settings.Section>
      <Settings.Section sectionId="security" title="Security">
        <SecuritySettingsForm />
      </Settings.Section>
      <Settings.Section sectionId="notifications" title="Notifications">
        <NotificationPreferences />
      </Settings.Section>
    </Settings>
  );
}
```

## State Management

All templates support four core states with sensible defaults:

### Default States

```tsx
<Dashboard
  loading={isLoading}      // Shows loading spinner
  error={error}             // Shows error message with retry
  isEmpty={!hasData}        // Shows empty state with action
  permissionDenied={!canView} // Shows permission denied message
>
  {/* Your content */}
</Dashboard>
```

### Custom State Overrides

Override any state with your own components using render props:

```tsx
<Dashboard
  loading={isLoading}
  renderLoading={() => (
    <CustomLoadingState message="Loading dashboard..." />
  )}
  renderError={(error) => (
    <CustomErrorState
      error={error}
      onRetry={handleRetry}
      onContactSupport={handleSupport}
    />
  )}
  renderEmpty={() => (
    <CustomEmptyState
      title="No data yet"
      action={<CreateWidgetButton />}
    />
  )}
>
  {/* Your content */}
</Dashboard>
```

### State Priority

States are evaluated in this order (highest to lowest):
1. **Loading** - Blocks all other states during data fetch
2. **Permission Denied** - Access control takes priority
3. **Error** - Error conditions override empty
4. **Empty** - Shown when data is absent but no error
5. **Success** - Default render when no state flags active

## API Reference

### Dashboard

```tsx
interface DashboardProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: Error;
  isEmpty?: boolean;
  permissionDenied?: boolean;
  renderLoading?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error?: Error) => React.ReactNode;
  renderPermissionDenied?: () => React.ReactNode;
  className?: string;
  'aria-label'?: string;
}
```

**Sub-components**:
- `Dashboard.Header` - Page header with title, subtitle, breadcrumbs, actions
- `Dashboard.Grid` - Responsive grid for widgets (supports mobile/tablet/desktop columns)
- `Dashboard.FilterBar` - Collapsible filter controls

### ListDetail

```tsx
interface ListDetailProps {
  children: React.ReactNode;
  selectedId?: string | number | null;
  defaultSelectedId?: string | number | null;
  onSelectedIdChange?: (id: string | number | null) => void;
  splitRatio?: [number, number]; // e.g., [1, 2] for 33%/67% split
  listMinWidth?: number; // Minimum list width in pixels
  mobileLayout?: 'stack' | 'overlay'; // Mobile behavior
  loading?: boolean;
  error?: Error;
  isEmpty?: boolean;
  permissionDenied?: boolean;
  // ...state render props
}
```

**Sub-components**:
- `ListDetail.List` - List panel with optional search
- `ListDetail.Detail` - Detail panel with optional back button (mobile)

### Wizard

```tsx
interface WizardProps {
  steps: WizardStepConfig[];
  children: React.ReactNode;
  stepIndex?: number; // Controlled
  defaultStepIndex?: number; // Uncontrolled
  onStepIndexChange?: (index: number) => void;
  onComplete?: () => void | Promise<void>;
  onCancel?: () => void;
  showStepIndicator?: boolean;
  stepIndicatorVariant?: 'dots' | 'numbers' | 'labels';
  allowFreeNavigation?: boolean;
  loading?: boolean;
  error?: Error;
  // ...state render props
}
```

**Sub-components**:
- `Wizard.Step` - Individual step content
- `Wizard.Navigation` - Previous/Next/Cancel/Finish buttons

### Settings

```tsx
interface SettingsProps {
  sections: SettingsSectionConfig[];
  children: React.ReactNode;
  activeSection?: string; // Controlled
  defaultActiveSection?: string; // Uncontrolled
  onActiveSectionChange?: (sectionId: string) => void;
  sidebarLayout?: 'sticky' | 'scrollable';
  mobileLayout?: 'tabs' | 'dropdown';
  loading?: boolean;
  error?: Error;
  // ...state render props
}
```

**Sub-components**:
- `Settings.Section` - Individual settings section
- `Settings.Navigation` - Sidebar navigation (auto-rendered)

## Integration with F01 (Design System)

Templates use F01 design tokens for consistent theming:

```tsx
import { ThemeProvider } from '@django-core/design-system';

function App() {
  return (
    <ThemeProvider theme="light">
      <Dashboard>
        {/* Templates automatically use F01 spacing, colors, typography */}
      </Dashboard>
    </ThemeProvider>
  );
}
```

## Integration with F06 (Layouts)

Combine templates with F06 layouts for complete page structure:

```tsx
import { AppShell } from '@django-core/layouts';
import { Dashboard } from '@django-core/page-templates';

function AnalyticsPage() {
  return (
    <AppShell
      sidebar={<NavigationSidebar />}
      header={<AppHeader />}
    >
      <Dashboard>
        {/* Dashboard content */}
      </Dashboard>
    </AppShell>
  );
}
```

## Accessibility

All templates follow WCAG 2.1 AA guidelines:

- ✅ Semantic HTML5 elements
- ✅ Proper ARIA labels and roles
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Screen reader tested
- ✅ 4.5:1 color contrast minimum

### Custom Accessibility

```tsx
<Dashboard
  aria-label="Analytics Dashboard"
  aria-describedby="dashboard-description"
>
  <p id="dashboard-description" className="sr-only">
    View and analyze key performance metrics
  </p>
  {/* Content */}
</Dashboard>
```

## Performance

### Bundle Size

- Core package: <15KB gzipped
- Tree-shakeable: Import only what you need
- Zero runtime overhead

### Optimization Tips

1. **Lazy load templates**: Use `React.lazy()` for code splitting
2. **Memoize expensive renders**: Use `React.memo()` on list items
3. **Virtualize long lists**: Use `react-window` in ListDetail
4. **Debounce search**: Use 300ms debounce for search inputs

```tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@django-core/page-templates').then(m => ({ default: m.Dashboard })));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard>
        {/* Content */}
      </Dashboard>
    </Suspense>
  );
}
```

## Troubleshooting

### Template not rendering

**Issue**: Component renders but content doesn't show
**Solution**: Check if any state flags (`loading`, `error`, `isEmpty`, `permissionDenied`) are accidentally set to `true`

### TypeScript errors

**Issue**: Type errors with prop types
**Solution**: Ensure you have `@types/react` and `@types/react-dom` installed and TypeScript 5.x+

### Styling conflicts

**Issue**: Custom styles not applying
**Solution**: Templates use minimal inline styles. Use `className` prop or CSS-in-JS for customization

### Mobile layout issues

**Issue**: Templates don't adapt to mobile
**Solution**: ListDetail requires parent with defined height. Settings needs viewport height constraint

```tsx
<div style={{ height: '100vh' }}>
  <ListDetail>
    {/* Content */}
  </ListDetail>
</div>
```

## Examples

See [examples/page-templates-demo](../../examples/page-templates-demo) for a complete demo application showing all templates in action.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Build the package
pnpm build

# Start Storybook
pnpm storybook

# Run Chromatic visual tests (requires CHROMATIC_PROJECT_TOKEN)
pnpm chromatic
```

### Chromatic Setup

Visual regression testing is configured via Chromatic. To set up:

1. Create a Chromatic project at [chromatic.com](https://www.chromatic.com/)
2. Update `chromatic.config.json` with your project ID
3. Set `CHROMATIC_PROJECT_TOKEN` environment variable
4. Run `pnpm chromatic` to publish stories and capture baselines

Visual diffs are automatically detected with a 0.5% threshold (`diffThreshold: 0.005`).

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## License

MIT © TeamReel

## Links

- [Documentation](../../docs/features/page-templates/)
- [Storybook](https://main--django-core-storybook.chromatic.com)
- [API Reference](../../kitty-specs/029-reusable-page-templates/data-model.md)
- [Issues](https://github.com/TeamReel/django-core/issues)
