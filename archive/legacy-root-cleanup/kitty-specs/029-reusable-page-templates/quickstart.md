# Quick Start Guide: Reusable Page Templates
*Path: [kitty-specs/029-reusable-page-templates/quickstart.md](kitty-specs/029-reusable-page-templates/quickstart.md)*

**Feature**: F08 - Reusable Page Templates
**Phase**: Phase 1 - Design & Contracts
**Date**: 2025-12-13

## Overview

This guide helps developers quickly integrate page templates into their applications. Each template provides a structured layout with built-in responsive behavior, state management, and accessibility features.

**What you'll learn**:
- Installing the package
- Basic usage for each template
- Common customization patterns
- Integration with F01/F06/F07

---

## Installation

```bash
# From monorepo root
pnpm add @django-core/page-templates

# Peer dependencies (if not already installed)
pnpm add @django-core/design-system @django-core/layouts @django-core/theme-system
pnpm add react react-dom
```

**TypeScript Setup**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  }
}
```

---

## 1. Dashboard Template

### Basic Dashboard

```tsx
import { Dashboard } from '@django-core/page-templates';

function AnalyticsDashboard() {
  return (
    <Dashboard>
      <Dashboard.Header
        title="Analytics Dashboard"
        subtitle="Real-time business metrics"
        actions={
          <button onClick={() => window.location.reload()}>
            Refresh Data
          </button>
        }
      />

      <Dashboard.Grid columns={3}>
        <MetricCard title="Revenue" value="$45,231" trend="+12%" />
        <MetricCard title="Active Users" value="1,234" trend="+5%" />
        <MetricCard title="Conversion Rate" value="12.5%" trend="-2%" />
      </Dashboard.Grid>
    </Dashboard>
  );
}
```

### With Filters

```tsx
import { Dashboard } from '@django-core/page-templates';
import { useState } from 'react';

function FilteredDashboard() {
  const [dateRange, setDateRange] = useState('last-7-days');

  return (
    <Dashboard>
      <Dashboard.Header title="Sales Dashboard" />

      <Dashboard.FilterBar>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
          <option value="last-7-days">Last 7 Days</option>
          <option value="last-30-days">Last 30 Days</option>
          <option value="last-90-days">Last 90 Days</option>
        </select>
      </Dashboard.FilterBar>

      <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
        {/* Widgets filtered by dateRange */}
      </Dashboard.Grid>
    </Dashboard>
  );
}
```

### With Loading State

```tsx
import { Dashboard } from '@django-core/page-templates';
import { useQuery } from '@tanstack/react-query';

function AsyncDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: fetchMetrics,
  });

  return (
    <Dashboard
      loading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
    >
      <Dashboard.Header title="Metrics Dashboard" />
      <Dashboard.Grid columns={3}>
        {data?.map(metric => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </Dashboard.Grid>
    </Dashboard>
  );
}
```

---

## 2. List-Detail Template

### Basic List-Detail

```tsx
import { ListDetail } from '@django-core/page-templates';
import { useState } from 'react';

function ProjectsView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const projects = useProjects();
  const selectedProject = projects.find(p => p.id === selectedId);

  return (
    <ListDetail
      selectedId={selectedId}
      onSelectedIdChange={setSelectedId}
    >
      <ListDetail.List showSearch searchPlaceholder="Search projects...">
        {projects.map(project => (
          <button
            key={project.id}
            onClick={() => setSelectedId(project.id)}
            aria-selected={selectedId === project.id}
          >
            <h3>{project.name}</h3>
            <p>{project.description}</p>
          </button>
        ))}
      </ListDetail.List>

      <ListDetail.Detail>
        {selectedProject ? (
          <ProjectDetails project={selectedProject} />
        ) : (
          <p>Select a project to view details</p>
        )}
      </ListDetail.Detail>
    </ListDetail>
  );
}
```

### With Search

```tsx
import { ListDetail } from '@django-core/page-templates';
import { useState, useMemo } from 'react';

function SearchableList() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const allProjects = useProjects();

  const filteredProjects = useMemo(() => {
    return allProjects.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allProjects, searchQuery]);

  return (
    <ListDetail selectedId={selectedId} onSelectedIdChange={setSelectedId}>
      <ListDetail.List
        showSearch
        onSearchChange={setSearchQuery}
        isEmpty={filteredProjects.length === 0}
      >
        {filteredProjects.map(project => (
          <ProjectListItem
            key={project.id}
            project={project}
            onClick={() => setSelectedId(project.id)}
          />
        ))}
      </ListDetail.List>

      <ListDetail.Detail>
        {selectedId && <ProjectDetails projectId={selectedId} />}
      </ListDetail.Detail>
    </ListDetail>
  );
}
```

---

## 3. Wizard Template

### Basic Wizard

```tsx
import { Wizard, WizardStepConfig } from '@django-core/page-templates';
import { useState } from 'react';

const steps: WizardStepConfig[] = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'details', label: 'Project Details', optional: true },
  { id: 'review', label: 'Review & Submit' },
];

function ProjectCreationWizard() {
  const [formData, setFormData] = useState({});

  const handleComplete = async (data: unknown) => {
    await createProject(data);
    console.log('Project created:', data);
  };

  return (
    <Wizard
      steps={steps}
      onComplete={handleComplete}
      onCancel={() => history.back()}
    >
      <Wizard.Step stepId="basic">
        <BasicInfoForm
          data={formData}
          onChange={setFormData}
        />
      </Wizard.Step>

      <Wizard.Step stepId="details">
        <ProjectDetailsForm
          data={formData}
          onChange={setFormData}
        />
      </Wizard.Step>

      <Wizard.Step stepId="review">
        <ReviewSummary data={formData} />
      </Wizard.Step>
    </Wizard>
  );
}
```

### With Validation

```tsx
import { Wizard, WizardStepConfig } from '@django-core/page-templates';
import { useState } from 'react';

const steps: WizardStepConfig[] = [
  {
    id: 'account',
    label: 'Account Setup',
    validate: async (data: any) => {
      return data.email && data.password && data.password.length >= 8;
    },
  },
  {
    id: 'profile',
    label: 'Profile Information',
    validate: async (data: any) => {
      return data.firstName && data.lastName;
    },
  },
  {
    id: 'confirm',
    label: 'Confirmation',
  },
];

function SignupWizard() {
  const [formData, setFormData] = useState<any>({});

  return (
    <Wizard
      steps={steps}
      showStepIndicator
      stepIndicatorVariant="numbers"
      onComplete={async (data) => {
        await registerUser(data);
        navigateTo('/dashboard');
      }}
    >
      <Wizard.Step stepId="account">
        <AccountForm data={formData} onChange={setFormData} />
      </Wizard.Step>

      <Wizard.Step stepId="profile">
        <ProfileForm data={formData} onChange={setFormData} />
      </Wizard.Step>

      <Wizard.Step stepId="confirm">
        <ConfirmationView data={formData} />
      </Wizard.Step>
    </Wizard>
  );
}
```

### Controlled Wizard (URL-Driven)

```tsx
import { Wizard } from '@django-core/page-templates';
import { useSearchParams } from 'react-router-dom';

function URLWizard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStep = parseInt(searchParams.get('step') ?? '0', 10);

  const handleStepChange = (index: number) => {
    setSearchParams({ step: index.toString() });
  };

  return (
    <Wizard
      steps={steps}
      stepIndex={currentStep}
      onStepIndexChange={handleStepChange}
    >
      {/* Steps... */}
    </Wizard>
  );
}
```

---

## 4. Settings Template

### Basic Settings

```tsx
import { Settings, SettingsSectionConfig } from '@django-core/page-templates';

const sections: SettingsSectionConfig[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security & Privacy' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing', label: 'Billing' },
];

function UserSettings() {
  return (
    <Settings sections={sections}>
      <Settings.Section
        sectionId="profile"
        title="Profile Settings"
        description="Manage your personal information"
      >
        <ProfileForm />
      </Settings.Section>

      <Settings.Section sectionId="security">
        <PasswordChangeForm />
        <TwoFactorSetup />
      </Settings.Section>

      <Settings.Section sectionId="notifications">
        <NotificationPreferences />
      </Settings.Section>

      <Settings.Section sectionId="billing">
        <BillingInfo />
      </Settings.Section>
    </Settings>
  );
}
```

### With URL-Based Navigation

```tsx
import { Settings } from '@django-core/page-templates';
import { useSearchParams } from 'react-router-dom';

function SettingsWithRouter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') ?? 'profile';

  const handleSectionChange = (sectionId: string) => {
    setSearchParams({ section: sectionId });
  };

  return (
    <Settings
      sections={sections}
      activeSection={activeSection}
      onActiveSectionChange={handleSectionChange}
    >
      {/* Sections... */}
    </Settings>
  );
}
```

---

## 5. Customizing Default States

### Custom Empty State

```tsx
import { Dashboard } from '@django-core/page-templates';

function DashboardWithCustomEmpty() {
  const hasData = false;

  return (
    <Dashboard
      isEmpty={!hasData}
      renderEmpty={() => (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h2>No Metrics Yet</h2>
          <p>Connect your data sources to see analytics</p>
          <button onClick={openDataSourceWizard}>
            Connect Data Source
          </button>
        </div>
      )}
    >
      {/* Dashboard content */}
    </Dashboard>
  );
}
```

### Custom Error State

```tsx
import { ListDetail } from '@django-core/page-templates';

function ListWithCustomError() {
  const { data, error } = useQuery(['projects'], fetchProjects);

  return (
    <ListDetail
      renderError={(error) => (
        <div role="alert">
          <h2>Failed to Load Projects</h2>
          <p>{error.message}</p>
          <button onClick={() => queryClient.invalidateQueries(['projects'])}>
            Try Again
          </button>
          <a href="/support">Contact Support</a>
        </div>
      )}
    >
      {/* List-Detail content */}
    </ListDetail>
  );
}
```

### Custom Loading State

```tsx
import { Wizard } from '@django-core/page-templates';

function WizardWithCustomLoading() {
  return (
    <Wizard
      steps={steps}
      renderLoading={() => (
        <div className="custom-loading">
          <YourCustomSpinner />
          <p>Preparing your wizard...</p>
        </div>
      )}
    >
      {/* Wizard steps */}
    </Wizard>
  );
}
```

---

## 6. Integration with F01/F06/F07

### Using F01 Components Inside Templates

```tsx
import { Dashboard } from '@django-core/page-templates';
import { Button, Card, Heading, Text } from '@django-core/design-system';

function DashboardWithF01() {
  return (
    <Dashboard>
      <Dashboard.Header
        title="Dashboard"
        actions={
          <>
            <Button variant="secondary" size="sm">Export</Button>
            <Button variant="primary" size="sm">Refresh</Button>
          </>
        }
      />

      <Dashboard.Grid columns={3}>
        <Card>
          <Heading level={3}>Total Revenue</Heading>
          <Text size="2xl" weight="bold">$45,231</Text>
        </Card>
        {/* More cards... */}
      </Dashboard.Grid>
    </Dashboard>
  );
}
```

### Using F06 Responsive Utilities

```tsx
import { ListDetail } from '@django-core/page-templates';
import { useBreakpoint } from '@django-core/layouts';

function ResponsiveListDetail() {
  const { isMobile } = useBreakpoint();

  return (
    <ListDetail
      mobileLayout={isMobile ? 'overlay' : 'stack'}
      splitRatio={[1, 2]}
    >
      {/* List-Detail content */}
    </ListDetail>
  );
}
```

### Using F07 Theme Tokens

```tsx
import { Settings } from '@django-core/page-templates';
import { themeVars } from '@django-core/theme-system';

function ThemedSettings() {
  return (
    <Settings
      sections={sections}
      style={{
        backgroundColor: themeVars.background.surface,
        color: themeVars.text.primary,
      }}
    >
      {/* Settings sections */}
    </Settings>
  );
}
```

---

## 7. Common Patterns

### Async Data Loading

```tsx
import { Dashboard } from '@django-core/page-templates';
import { useQuery } from '@tanstack/react-query';

function AsyncDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  return (
    <Dashboard loading={isLoading} error={error} isEmpty={!data?.length}>
      <Dashboard.Header title="Metrics" />
      <Dashboard.Grid columns={3}>
        {data?.map(metric => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </Dashboard.Grid>
    </Dashboard>
  );
}
```

### Form Submission

```tsx
import { Wizard } from '@django-core/page-templates';
import { useMutation } from '@tanstack/react-query';

function FormWizard() {
  const createMutation = useMutation({
    mutationFn: createResource,
  });

  const handleComplete = async (data: unknown) => {
    await createMutation.mutateAsync(data);
    navigateTo('/success');
  };

  return (
    <Wizard steps={steps} onComplete={handleComplete}>
      {/* Wizard steps */}
    </Wizard>
  );
}
```

### Accessibility

```tsx
import { Settings } from '@django-core/page-templates';

function AccessibleSettings() {
  return (
    <Settings
      sections={sections}
      aria-label="User account settings"
    >
      <Settings.Section
        sectionId="profile"
        aria-labelledby="profile-heading"
      >
        <h2 id="profile-heading">Profile Information</h2>
        {/* Form fields with proper labels */}
      </Settings.Section>
    </Settings>
  );
}
```

---

## 8. Performance Tips

### Lazy Load Heavy Components

```tsx
import { lazy, Suspense } from 'react';
import { Dashboard } from '@django-core/page-templates';

const HeavyChart = lazy(() => import('./HeavyChart'));

function PerformantDashboard() {
  return (
    <Dashboard>
      <Dashboard.Header title="Performance Dashboard" />
      <Dashboard.Grid columns={2}>
        <Suspense fallback={<LoadingCard />}>
          <HeavyChart />
        </Suspense>
      </Dashboard.Grid>
    </Dashboard>
  );
}
```

### Memoize Expensive Computations

```tsx
import { useMemo } from 'react';
import { ListDetail } from '@django-core/page-templates';

function OptimizedList() {
  const projects = useProjects();

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  return (
    <ListDetail>
      <ListDetail.List>
        {sortedProjects.map(project => (
          <ProjectItem key={project.id} project={project} />
        ))}
      </ListDetail.List>
    </ListDetail>
  );
}
```

---

## State Override System

All templates support customizing loading, empty, error, and permission-denied states through render props. This allows you to match state UI to your application's design language while maintaining consistent behavior.

### When to Override vs Use Defaults

**Use Defaults When**:
- You want consistent state UI across your application
- Your design matches generic SaaS patterns
- You're prototyping or building MVPs quickly

**Override When**:
- Brand-specific messaging is required
- You need custom actions (e.g., "Contact Support", "Upgrade Plan")
- State content varies by context (e.g., different empty messages per template instance)
- Accessibility requires specific ARIA labels or focus management

### Render Prop Pattern

All templates support four render props with consistent naming:

```tsx
interface StateRenderProps {
  renderLoading?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;
  renderPermissionDenied?: () => React.ReactNode;
}
```

### Basic Examples

#### Custom Loading State

```tsx
<Dashboard
  loading={isLoading}
  renderLoading={() => (
    <div className="custom-loader">
      <Spinner size="large" />
      <p>Loading your dashboard data...</p>
    </div>
  )}
>
  <Dashboard.Header title="Analytics" />
</Dashboard>
```

#### Custom Empty State with Actions

```tsx
<ListDetail
  isEmpty={projects.length === 0}
  renderEmpty={() => (
    <EmptyState
      icon={<FolderIcon />}
      title="No Projects Yet"
      description="Create your first project to get started"
      actions={
        <button onClick={handleCreateProject}>
          Create Project
        </button>
      }
    />
  )}
>
  <ListDetail.List>{/* ... */}</ListDetail.List>
  <ListDetail.Detail>{/* ... */}</ListDetail.Detail>
</ListDetail>
```

#### Custom Error State with Retry

```tsx
<Wizard
  steps={steps}
  error={error}
  renderError={(error) => (
    <ErrorState
      title="Setup Failed"
      message={error.message}
      actions={
        <>
          <button onClick={handleRetry}>Try Again</button>
          <button onClick={handleContactSupport}>Contact Support</button>
        </>
      }
    />
  )}
>
  {/* Wizard steps */}
</Wizard>
```

#### Custom Permission Denied State

```tsx
<Settings
  sections={adminSections}
  permissionDenied={!isAdmin}
  renderPermissionDenied={() => (
    <PermissionDenied
      title="Admin Access Required"
      description="Contact your administrator to request elevated permissions"
      actions={<button onClick={handleRequestAccess}>Request Access</button>}
    />
  )}
>
  {/* Settings sections */}
</Settings>
```

### State Priority

Templates apply states in the following priority order:

1. **Loading** (highest priority) - blocks all other states
2. **Permission Denied** - takes priority over error/empty
3. **Error** - takes priority over empty
4. **Empty** - displayed when no error and data is empty
5. **Success** (default) - renders children when no state flags are set

**Example**:
```tsx
// Only loading state renders even though error is also set
<Dashboard loading={true} error={new Error()} isEmpty={true}>
  {/* This content is NOT rendered */}
</Dashboard>
```

### Accessibility Guidelines for Custom States

When overriding states, maintain accessibility:

#### 1. Loading States
- **Use `aria-live="polite"`** for loading announcements
- **Include visible text** ("Loading...") not just spinners
- **Preserve focus** - don't trap or lose focus during loading

```tsx
renderLoading={() => (
  <div role="status" aria-live="polite" aria-atomic="true">
    <Spinner aria-hidden="true" />
    <span>Loading dashboard data</span>
  </div>
)}
```

#### 2. Error States
- **Use `role="alert"`** for critical errors
- **Include actionable next steps** (Retry, Contact Support)
- **Provide error details** for screen readers

```tsx
renderError={(error) => (
  <div role="alert" aria-live="assertive">
    <h2>Error Loading Data</h2>
    <p>{error.message}</p>
    <button onClick={handleRetry}>Retry</button>
  </div>
)}
```

#### 3. Empty States
- **Use clear, descriptive text** explaining why empty
- **Provide primary action** to resolve empty state
- **Ensure buttons have sufficient contrast** (WCAG AA minimum)

```tsx
renderEmpty={() => (
  <div role="status">
    <h2>No Data Available</h2>
    <p>Get started by adding your first item</p>
    <button>Add Item</button>
  </div>
)}
```

#### 4. Permission Denied States
- **Explain the requirement** clearly
- **Provide contact/escalation path** if applicable
- **Use appropriate ARIA roles** (`role="status"` or `role="alert"`)

```tsx
renderPermissionDenied={() => (
  <div role="status">
    <h2>Access Restricted</h2>
    <p>This page requires administrator permissions</p>
    <button onClick={handleContactAdmin}>Contact Admin</button>
  </div>
)}
```

### Layout Preservation

Override content **replaces the template entirely**—no wrapper elements are added. Ensure your custom state content:

- Is styled consistently (use F01 design system components)
- Handles responsive breakpoints appropriately
- Maintains minimum height for good UX (e.g., 300-400px for centered states)

**Example**:
```tsx
renderEmpty={() => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
      padding: '2rem',
    }}
  >
    {/* Centered empty state */}
  </div>
)}
```

### Partial Overrides

You can override only specific states while using defaults for others:

```tsx
<Dashboard
  loading={isLoading}
  isEmpty={widgets.length === 0}
  error={error}
  // Only override empty, use defaults for loading/error
  renderEmpty={() => <CustomEmptyDashboard />}
>
  {/* Dashboard content */}
</Dashboard>
```

### Testing State Overrides

Verify custom state rendering in unit tests:

```tsx
import { render, screen } from '@testing-library/react';
import { Dashboard } from '@django-core/page-templates';

it('renders custom loading state', () => {
  render(
    <Dashboard
      loading
      renderLoading={() => <div data-testid="custom-loader">Loading</div>}
    >
      <Dashboard.Header title="Test" />
    </Dashboard>
  );

  expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
  expect(screen.queryByText('Test')).not.toBeInTheDocument();
});
```

---

## Next Steps

- **API Reference**: See [data-model.md](data-model.md) for complete TypeScript interfaces
- **Examples**: Browse `examples/page-templates/` for full working examples
- **Storybook**: Run `pnpm storybook` to explore interactive component demos (including state override stories)
- **Testing**: See [testing guide](../../docs/contributing/testing.md) for testing patterns

---

## Troubleshooting

### Templates don't respond to breakpoints

**Solution**: Ensure `@django-core/layouts` is installed and F06 CSS is imported:

```tsx
// In your app root
import '@django-core/layouts/styles.css';
```

### Custom states not rendering

**Solution**: Check that state props (`loading`, `error`, `isEmpty`) are set correctly:

```tsx
<Dashboard
  loading={isLoading}  // Must be boolean
  error={error || null}  // Must be Error | null
  isEmpty={!data}  // Must be boolean
>
```

### TypeScript errors with props

**Solution**: Install type definitions and ensure strict mode is enabled:

```bash
pnpm add -D @types/react @types/react-dom
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true
  }
}
```

---

**Quick Start Complete!** You now have the basics to use all page templates. Explore the full API in [data-model.md](data-model.md) for advanced usage.
