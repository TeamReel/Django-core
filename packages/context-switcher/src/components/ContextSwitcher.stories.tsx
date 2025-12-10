/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Meta, StoryObj } from '@storybook/react';
import { ContextSwitcher } from './ContextSwitcher';
import { ContextSwitcherProvider } from '../context/ContextSwitcherProvider';
import type { RouterAdapter } from '../types';

// Mock router adapter for Storybook
const mockRouterAdapter: RouterAdapter = {
  getCurrentPath: () => '/acme-corp/project-alpha',
  navigateTo: (path) => {
    console.log('Navigate to:', path);
    // In Storybook, just log the navigation
  },
  buildPathForContext: (ctx, options) => {
    const base = `/${ctx.orgSlug}`;
    const path = ctx.projectSlug ? `${base}/${ctx.projectSlug}` : base;
    return options?.fallbackPath ? `${path}${options.fallbackPath}` : path;
  },
};

// Mock organisations and projects for Storybook
const mockOrganisations = [
  { id: '1', name: 'Acme Corporation', slug: 'acme-corp', logo: 'https://via.placeholder.com/40' },
  { id: '2', name: 'Beta Industries', slug: 'beta-industries', logo: 'https://via.placeholder.com/40' },
  { id: '3', name: 'Gamma Ltd', slug: 'gamma-ltd' },
  { id: '4', name: 'Delta Solutions', slug: 'delta-solutions' },
  { id: '5', name: 'Epsilon Corp', slug: 'epsilon-corp' },
];

const mockProjects = [
  { id: 'p1', name: 'Project Alpha', slug: 'project-alpha', organisationId: '1' },
  { id: 'p2', name: 'Project Beta', slug: 'project-beta', organisationId: '1' },
  { id: 'p3', name: 'Project Gamma', slug: 'project-gamma', organisationId: '1' },
  { id: 'p4', name: 'Beta Project 1', slug: 'beta-project-1', organisationId: '2' },
  { id: 'p5', name: 'Beta Project 2', slug: 'beta-project-2', organisationId: '2' },
];

// Mock fetch for Storybook
const setupMockFetch = () => {
  global.fetch = ((url: string) => {
    if (url.includes('/organisations') && !url.includes('/projects')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockOrganisations }),
      });
    }

    if (url.includes('/projects')) {
      // Extract org slug from URL
      const orgSlug = url.match(/organisations\/([^/]+)\/projects/)?.[1];
      const org = mockOrganisations.find((o) => o.slug === orgSlug);
      const projects = org ? mockProjects.filter((p) => p.organisationId === org.id) : [];

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: projects }),
      });
    }

    return Promise.resolve({
      ok: false,
      statusText: 'Not Found',
    });
  }) as typeof fetch;
};

// Setup fetch mock when stories load
setupMockFetch();

const meta: Meta<typeof ContextSwitcher> = {
  title: 'Components/ContextSwitcher',
  component: ContextSwitcher,
  decorators: [
    (Story) => (
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api/v1',
        }}
      >
        <div style={{ padding: '20px' }}>
          <Story />
        </div>
      </ContextSwitcherProvider>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Layout variant for the context switcher',
    },
    className: {
      control: 'text',
      description: 'Optional CSS class for custom styling',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ContextSwitcher>;

/**
 * Default horizontal layout - suitable for app headers
 */
export const Horizontal: Story = {
  args: {
    variant: 'horizontal',
  },
};

/**
 * Vertical layout - suitable for sidebars
 */
export const Vertical: Story = {
  args: {
    variant: 'vertical',
  },
};

/**
 * In a header context with typical styling
 */
export const InHeader: Story = {
  args: {
    variant: 'horizontal',
  },
  decorators: [
    (Story) => (
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 20px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>MyApp</div>
        <Story />
        <div style={{ marginLeft: 'auto' }}>User Menu</div>
      </header>
    ),
  ],
};

/**
 * In a sidebar context with typical styling
 */
export const InSidebar: Story = {
  args: {
    variant: 'vertical',
  },
  decorators: [
    (Story) => (
      <aside
        style={{
          width: '250px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRight: '1px solid #ddd',
          minHeight: '400px',
        }}
      >
        <Story />
        <nav style={{ marginTop: '20px' }}>
          <div style={{ padding: '8px 0' }}>Dashboard</div>
          <div style={{ padding: '8px 0' }}>Projects</div>
          <div style={{ padding: '8px 0' }}>Settings</div>
        </nav>
      </aside>
    ),
  ],
};

/**
 * Custom styled with className
 */
export const CustomStyled: Story = {
  args: {
    variant: 'horizontal',
    className: 'custom-context-switcher',
  },
  decorators: [
    (Story) => (
      <div>
        <style>
          {`
            .custom-context-switcher {
              padding: 12px;
              background-color: #e3f2fd;
              border: 2px solid #1976d2;
              border-radius: 8px;
            }
          `}
        </style>
        <Story />
      </div>
    ),
  ],
};

/**
 * With loading state (simulated)
 */
export const Loading: Story = {
  args: {
    variant: 'horizontal',
  },
  decorators: [
    (Story) => {
      // Mock slow API to show loading state
      global.fetch = (() => {
        return new Promise(() => {
          // Never resolves - shows loading indefinitely
        });
      }) as typeof fetch;

      return <Story />;
    },
  ],
};

/**
 * With error state (simulated)
 */
export const Error: Story = {
  args: {
    variant: 'horizontal',
  },
  decorators: [
    (Story) => {
      // Mock failed API
      global.fetch = (() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: { message: 'Failed to load organisations' } }),
        });
      }) as typeof fetch;

      return <Story />;
    },
  ],
};

/**
 * Compact variant - minimal spacing
 */
export const Compact: Story = {
  args: {
    variant: 'horizontal',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Story />
      </div>
    ),
  ],
};
