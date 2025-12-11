import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import { useContextSwitcher } from '../../src/hooks/useContextSwitcher';
import type { RouterAdapter } from '../../src/types';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock router adapter
const mockRouterAdapter: RouterAdapter = {
  getCurrentPath: jest.fn(() => '/acme-corp/website-redesign'),
  buildPathForContext: jest.fn((context, options) => {
    if (context.projectSlug) {
      return `/${context.orgSlug}/${context.projectSlug}`;
    }
    return `/${context.orgSlug}`;
  }),
  navigateTo: jest.fn(),
};

const TestComponent: React.FC<{ onContextChange?: () => void }> = ({ onContextChange }) => {
  const { context, organisations, projects, switchContext, isSwitching, refresh } = useContextSwitcher();

  React.useEffect(() => {
    if (!context.isLoading && context.organisation && onContextChange) {
      onContextChange();
    }
  }, [context.isLoading, context.organisation, onContextChange]);

  return (
    <div>
      <div data-testid="loading">{context.isLoading ? 'Loading' : 'Ready'}</div>
      <div data-testid="org-name">{context.organisation?.name || 'None'}</div>
      <div data-testid="project-name">{context.project?.name || 'None'}</div>
      <div data-testid="error">{context.error?.message || 'No error'}</div>
      <div data-testid="switching">{isSwitching ? 'Switching' : 'Idle'}</div>
      <div data-testid="org-count">{organisations.length}</div>
      <div data-testid="project-count">{projects.length}</div>
      <button
        onClick={() => {
          const newOrg = organisations.find(o => o.id === 'org_456');
          if (newOrg) switchContext(newOrg, null);
        }}
        data-testid="switch-org"
      >
        Switch Org
      </button>
      <button onClick={refresh} data-testid="refresh">
        Refresh
      </button>
    </div>
  );
};

describe('ContextSwitcherProvider', () => {
  beforeEach(() => {
    (mockRouterAdapter.getCurrentPath as jest.Mock).mockReturnValue('/acme-corp/website-redesign');
    (mockRouterAdapter.navigateTo as jest.Mock).mockClear();
    (mockRouterAdapter.buildPathForContext as jest.Mock).mockClear();
  });

  it('fetches initial context on mount', async () => {
    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    // Initially loading
    expect(getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for context to load
    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('Ready');
    });

    expect(getByTestId('org-name')).toHaveTextContent('Acme Corp');
    expect(getByTestId('project-name')).toHaveTextContent('Website Redesign');
  });

  it('provides organisations and projects', async () => {
    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('org-count')).toHaveTextContent('2');
      expect(getByTestId('project-count')).toHaveTextContent('1');
    });
  });

  it('switches context successfully', async () => {
    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('org-name')).toHaveTextContent('Acme Corp');
    });

    // Switch to different org
    const switchButton = getByTestId('switch-org');
    await act(async () => {
      switchButton.click();
    });

    // Should show switching state
    await waitFor(() => {
      expect(mockRouterAdapter.navigateTo).toHaveBeenCalledWith('/beta-inc');
    });
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.get('/api/organisations/', () => {
        return HttpResponse.json(
          { detail: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('Ready');
    });

    // Should have error state
    expect(getByTestId('error')).not.toHaveTextContent('No error');
  });

  it('clears project when switching to org with no projects', async () => {
    server.use(
      http.get('/api/organisations/org_456/projects/', () => {
        return HttpResponse.json({ projects: [] });
      })
    );

    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('project-name')).toHaveTextContent('Website Redesign');
    });

    // Switch org
    const switchButton = getByTestId('switch-org');
    await act(async () => {
      switchButton.click();
    });

    await waitFor(() => {
      expect(mockRouterAdapter.navigateTo).toHaveBeenCalled();
    });
  });

  it('calls onContextChanged callback', async () => {
    const onContextChanged = jest.fn();

    render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
          onContextChanged,
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(onContextChanged).toHaveBeenCalled();
    });
  });

  it('calls onBeforeContextChange callback', async () => {
    const onBeforeContextChange = jest.fn().mockResolvedValue(true);

    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
          onBeforeContextChange,
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('org-name')).toHaveTextContent('Acme Corp');
    });

    const switchButton = getByTestId('switch-org');
    await act(async () => {
      switchButton.click();
    });

    await waitFor(() => {
      expect(onBeforeContextChange).toHaveBeenCalled();
    });
  });

  it('cancels context switch if onBeforeContextChange returns false', async () => {
    const onBeforeContextChange = jest.fn().mockResolvedValue(false);

    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
          onBeforeContextChange,
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('org-name')).toHaveTextContent('Acme Corp');
    });

    const switchButton = getByTestId('switch-org');
    await act(async () => {
      switchButton.click();
    });

    await waitFor(() => {
      expect(onBeforeContextChange).toHaveBeenCalled();
    });

    // Should NOT navigate
    expect(mockRouterAdapter.navigateTo).not.toHaveBeenCalled();
  });

  it('refreshes context on demand', async () => {
    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('org-name')).toHaveTextContent('Acme Corp');
    });

    const refreshButton = getByTestId('refresh');
    await act(async () => {
      refreshButton.click();
    });

    // Should re-fetch and maintain context
    await waitFor(() => {
      expect(getByTestId('org-name')).toHaveTextContent('Acme Corp');
    });
  });

  it('handles missing organisation in URL', async () => {
    (mockRouterAdapter.getCurrentPath as jest.Mock).mockReturnValue('/');

    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('Ready');
    });

    expect(getByTestId('org-name')).toHaveTextContent('None');
  });

  it('handles organisation not found in URL', async () => {
    (mockRouterAdapter.getCurrentPath as jest.Mock).mockReturnValue('/nonexistent');

    const { getByTestId } = render(
      <ContextSwitcherProvider
        config={{
          routerAdapter: mockRouterAdapter,
          apiBaseUrl: '/api',
        }}
      >
        <TestComponent />
      </ContextSwitcherProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('Ready');
    });

    // Should handle gracefully
    expect(getByTestId('org-name')).toHaveTextContent('None');
  });
});
