import type { Meta, StoryObj } from '@storybook/react';
import { Dashboard } from '../src/components/Dashboard';
import React from 'react';

/**
 * Dashboard Template
 *
 * A flexible dashboard layout for analytics, metrics, and overview pages.
 *
 * ## Features
 * - Responsive grid system with mobile/tablet/desktop breakpoints
 * - Built-in state management (loading, error, empty, permission denied)
 * - Customizable state renderers
 * - Header with breadcrumbs and action buttons
 * - Optional filter bar
 *
 * ## Accessibility
 * - WCAG 2.1 AA compliant
 * - Keyboard navigation support
 * - Screen reader tested
 * - Semantic HTML structure
 */
const meta = {
  title: 'Templates/Dashboard',
  component: Dashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Production-ready dashboard template with responsive grid, state management, and accessibility built-in.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock widget component for examples
const Widget = ({ title, value, trend }: { title: string; value: string; trend?: string }) => (
  <div
    style={{
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      backgroundColor: '#fff',
    }}
  >
    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>{title}</div>
    <div style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>{value}</div>
    {trend && <div style={{ fontSize: '0.875rem', color: '#10b981' }}>{trend}</div>}
  </div>
);

export const Basic: Story = {
  render: () => (
    <Dashboard>
      <Dashboard.Header
        title="Analytics Dashboard"
        subtitle="Track your key metrics in real-time"
        actions={
          <button style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
            Refresh
          </button>
        }
      />
      <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
        <Widget title="Total Revenue" value="$45,231" trend="↑ 12% from last month" />
        <Widget title="Active Users" value="1,234" trend="↑ 8% from last month" />
        <Widget title="Conversion Rate" value="12.5%" trend="↓ 2% from last month" />
      </Dashboard.Grid>
    </Dashboard>
  ),
};

export const Loading: Story = {
  render: () => (
    <Dashboard loading>
      <Dashboard.Header title="Analytics Dashboard" />
      <Dashboard.Grid>
        <Widget title="Revenue" value="$0" />
      </Dashboard.Grid>
    </Dashboard>
  ),
};

export const Empty: Story = {
  render: () => (
    <Dashboard isEmpty>
      <Dashboard.Header title="Analytics Dashboard" />
      <Dashboard.Grid />
    </Dashboard>
  ),
};

export const Error: Story = {
  render: () => (
    <Dashboard error={new Error('Failed to load dashboard data')}>
      <Dashboard.Header title="Analytics Dashboard" />
      <Dashboard.Grid>
        <Widget title="Revenue" value="$0" />
      </Dashboard.Grid>
    </Dashboard>
  ),
};

export const CustomEmptyState: Story = {
  name: 'Custom Empty State',
  render: () => (
    <Dashboard
      isEmpty
      renderEmpty={() => (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>No Data Yet</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Start by connecting your data sources to see insights here.
          </p>
          <button
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Connect Data Source
          </button>
        </div>
      )}
    >
      <Dashboard.Header title="Analytics Dashboard" />
    </Dashboard>
  ),
};

export const WithFilters: Story = {
  render: () => (
    <Dashboard>
      <Dashboard.Header
        title="Sales Dashboard"
        breadcrumbs={<span>Home / Dashboards / Sales</span>}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
              Export
            </button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
              Refresh
            </button>
          </div>
        }
      />
      <Dashboard.FilterBar collapsible>
        <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
        <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
          <option>All Regions</option>
          <option>North America</option>
          <option>Europe</option>
        </select>
        <input
          type="search"
          placeholder="Search..."
          style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        />
      </Dashboard.FilterBar>
      <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md">
        <Widget title="Revenue" value="$45,231" trend="↑ 12%" />
        <Widget title="Orders" value="1,234" trend="↑ 8%" />
        <Widget title="AOV" value="$36.70" trend="↑ 5%" />
        <Widget title="Customers" value="892" trend="↑ 15%" />
      </Dashboard.Grid>
    </Dashboard>
  ),
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: () => (
    <Dashboard>
      <Dashboard.Header
        title="Mobile Dashboard"
        subtitle="Optimized for mobile viewing"
        actions={<button style={{ padding: '0.5rem', fontSize: '0.875rem' }}>⋯</button>}
      />
      <Dashboard.FilterBar collapsible defaultCollapsed>
        <select style={{ padding: '0.5rem', width: '100%' }}>
          <option>Last 7 days</option>
        </select>
      </Dashboard.FilterBar>
      <Dashboard.Grid columns={1} gap="sm">
        <Widget title="Revenue" value="$45,231" trend="↑ 12%" />
        <Widget title="Users" value="1,234" trend="↑ 8%" />
        <Widget title="Conversion" value="12.5%" trend="↓ 2%" />
      </Dashboard.Grid>
    </Dashboard>
  ),
};

export const ComplexLayout: Story = {
  render: () => (
    <Dashboard>
      <Dashboard.Header
        title="Executive Dashboard"
        subtitle="Comprehensive business overview"
        breadcrumbs={<span>Home / Executive / Overview</span>}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
              PDF Report
            </button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
              Settings
            </button>
          </div>
        }
      />
      <Dashboard.FilterBar>
        <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
          <option>Q4 2025</option>
          <option>Q3 2025</option>
          <option>Q2 2025</option>
        </select>
        <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}>
          <option>All Departments</option>
          <option>Sales</option>
          <option>Marketing</option>
          <option>Engineering</option>
        </select>
      </Dashboard.FilterBar>
      <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="lg">
        <Widget title="Total Revenue" value="$245,231" trend="↑ 18% YoY" />
        <Widget title="Active Customers" value="3,234" trend="↑ 12% YoY" />
        <Widget title="Retention Rate" value="94.5%" trend="↑ 2.5% YoY" />
        <Widget title="MRR" value="$52,100" trend="↑ 15% MoM" />
        <Widget title="Churn Rate" value="2.3%" trend="↓ 0.8% MoM" />
        <Widget title="LTV" value="$4,250" trend="↑ 8% YoY" />
      </Dashboard.Grid>
    </Dashboard>
  ),
};

// ============================================================================
// State Override Stories
// ============================================================================

export const CustomLoadingState: Story = {
  name: 'Custom Loading State',
  render: () => (
    <Dashboard
      loading
      renderLoading={() => (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem',
            }}
          />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Loading Dashboard...
          </h3>
          <p style={{ color: '#6b7280' }}>
            Fetching your latest analytics data
          </p>
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
    >
      <Dashboard.Header title="Analytics Dashboard" />
    </Dashboard>
  ),
};

export const CustomErrorState: Story = {
  name: 'Custom Error State',
  render: () => (
    <Dashboard
      error={new Error('API rate limit exceeded')}
      renderError={(error) => (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#dc2626' }}>
            Unable to Load Dashboard
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
            {error?.message || 'An unexpected error occurred'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
            Please try again in a few moments or contact support if the problem persists.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <button
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Contact Support
            </button>
          </div>
        </div>
      )}
    >
      <Dashboard.Header title="Analytics Dashboard" />
    </Dashboard>
  ),
};

export const CustomPermissionDeniedState: Story = {
  name: 'Custom Permission Denied State',
  render: () => (
    <Dashboard
      permissionDenied
      renderPermissionDenied={() => (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Access Restricted
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            You don't have permission to view this dashboard. Please contact your administrator to request access.
          </p>
          <button
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
          Request Access
          </button>
        </div>
      )}
    >
      <Dashboard.Header title="Analytics Dashboard" />
    </Dashboard>
  ),
};

/**
 * Accessibility Example
 *
 * Demonstrates best practices for accessibility:
 * - Semantic aria-label for context
 * - Screen reader description
 * - Keyboard-accessible actions
 * - High contrast colors
 */
export const Accessibility: Story = {
  name: 'Accessibility Example',
  render: () => (
    <Dashboard aria-label="Sales analytics dashboard">
      <div id="dashboard-description" style={{ position: 'absolute', left: '-10000px' }}>
        View real-time sales metrics including revenue, users, and conversion rates
      </div>
      <Dashboard.Header
        title="Sales Analytics"
        subtitle="Real-time performance metrics"
        actions={
          <button
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
            aria-label="Refresh dashboard data"
          >
            Refresh
          </button>
        }
      />
      <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md">
        <Widget title="Revenue" value="$45,231" trend="↑ 12% from last month" />
        <Widget title="Users" value="1,234" trend="↑ 8% from last month" />
        <Widget title="Conversion" value="12.5%" trend="↓ 2% from last month" />
        <Widget title="Avg Order" value="$36.70" trend="↑ 5% from last month" />
      </Dashboard.Grid>
    </Dashboard>
  ),
};
