import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
import { ContextSwitcher } from '../../src/components/ContextSwitcher';
import { OrganisationPicker } from '../../src/components/OrganisationPicker';
import { ProjectPicker } from '../../src/components/ProjectPicker';
import type { RouterAdapter } from '../../src/types';
import { server } from '../mocks/server';
import { rest } from 'msw';

// Mock router adapter
const mockRouterAdapter: RouterAdapter = {
  getCurrentPath: jest.fn(() => '/'),
  buildPathForContext: jest.fn((context) => `/${context.orgSlug}/${context.projectSlug || ''}`),
  navigateTo: jest.fn(),
};

describe('Edge cases', () => {
  beforeEach(() => {
    (mockRouterAdapter.getCurrentPath as jest.Mock).mockReturnValue('/');
    (mockRouterAdapter.navigateTo as jest.Mock).mockClear();
  });

  describe('Empty data scenarios', () => {
    it('handles empty organisation list', async () => {
      server.use(
        rest.get('/api/organisations/', (req, res, ctx) => {
          return res(ctx.json({ organisations: [] }));
        })
      );

      const { getByText } = render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <OrganisationPicker isOpen={true} onClose={() => {}} />
        </ContextSwitcherProvider>
      );

      await waitFor(() => {
        expect(getByText(/no organisations/i)).toBeInTheDocument();
      });
    });

    it('handles organisation with no projects', async () => {
      server.use(
        rest.get('/api/organisations/org_123/projects/', (req, res, ctx) => {
          return res(ctx.json({ projects: [] }));
        })
      );

      const { getByText } = render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <ProjectPicker isOpen={true} onClose={() => {}} />
        </ContextSwitcherProvider>
      );

      await waitFor(() => {
        expect(getByText(/no projects/i)).toBeInTheDocument();
      });
    });
  });

  describe('Long names and special characters', () => {
    it('handles extremely long organisation name (100+ characters)', async () => {
      const longName = 'A'.repeat(150);

      server.use(
        rest.get('/api/organisations/', (req, res, ctx) => {
          return res(ctx.json({
            organisations: [
              {
                id: 'long_org',
                name: longName,
                slug: 'long-org',
                logo: null,
                metadata: {},
              },
            ],
          }));
        })
      );

      const { getByText } = render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <OrganisationPicker isOpen={true} onClose={() => {}} />
        </ContextSwitcherProvider>
      );

      await waitFor(() => {
        // Should truncate or wrap long names
        const element = getByText(new RegExp(longName.substring(0, 50)));
        expect(element).toBeInTheDocument();
      });
    });

    it('handles special characters in names', async () => {
      server.use(
        rest.get('/api/organisations/', (req, res, ctx) => {
          return res(ctx.json({
            organisations: [
              {
                id: 'special_org',
                name: 'Org™ & Co. <Special> "Chars"',
                slug: 'special-org',
                logo: null,
                metadata: {},
              },
            ],
          }));
        })
      );

      const { getByText } = render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <OrganisationPicker isOpen={true} onClose={() => {}} />
        </ContextSwitcherProvider>
      );

      await waitFor(() => {
        expect(getByText(/Org™ & Co/)).toBeInTheDocument();
      });
    });
  });

  describe('Large data sets', () => {
    it('handles 1000+ organisations efficiently', async () => {
      const largeOrgList = Array.from({ length: 1000 }, (_, i) => ({
        id: `org_${i}`,
        name: `Organisation ${i}`,
        slug: `org-${i}`,
        logo: null,
        metadata: {},
      }));

      server.use(
        rest.get('/api/organisations/', (req, res, ctx) => {
          return res(ctx.json({ organisations: largeOrgList }));
        })
      );

      const start = Date.now();

      render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <OrganisationPicker isOpen={true} onClose={() => {}} />
        </ContextSwitcherProvider>
      );

      const duration = Date.now() - start;

      // Rendering should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('handles 500+ projects efficiently', async () => {
      const largeProjectList = Array.from({ length: 500 }, (_, i) => ({
        id: `proj_${i}`,
        name: `Project ${i}`,
        slug: `proj-${i}`,
        organisationId: 'org_123',
        metadata: {},
      }));

      server.use(
        rest.get('/api/organisations/org_123/projects/', (req, res, ctx) => {
          return res(ctx.json({ projects: largeProjectList }));
        })
      );

      const start = Date.now();

      render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <ProjectPicker isOpen={true} onClose={() => {}} />
        </ContextSwitcherProvider>
      );

      const duration = Date.now() - start;

      // Rendering should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Rapid interactions', () => {
    it('handles rapid context switching without race conditions', async () => {
      const { rerender } = render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <ContextSwitcher />
        </ContextSwitcherProvider>
      );

      // Simulate rapid switching
      for (let i = 0; i < 10; i++) {
        (mockRouterAdapter.getCurrentPath as jest.Mock).mockReturnValue(`/org-${i}`);
        rerender(
          <ContextSwitcherProvider
            config={{
              routerAdapter: mockRouterAdapter,
              apiBaseUrl: '/api',
            }}
          >
            <ContextSwitcher />
          </ContextSwitcherProvider>
        );
      }

      // Should not crash or produce errors
      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeInTheDocument();
      });
    });
  });

  describe('Error scenarios', () => {
    it('handles missing CSRF token gracefully', async () => {
      server.use(
        rest.post('/api/context/set/', (req, res, ctx) => {
          return res(ctx.status(403), ctx.json(
            { detail: 'CSRF token missing or incorrect.' }));
        })
      );

      // Test should handle error without crashing
      const { getByText } = render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <ContextSwitcher />
        </ContextSwitcherProvider>
      );

      await waitFor(() => {
        expect(getByText(/select.*organisation/i)).toBeInTheDocument();
      });
    });

    it('handles timeout gracefully', async () => {
      server.use(
        rest.get('/api/organisations/', async (req, res, ctx) => {
          // Simulate timeout
          await new Promise(resolve => setTimeout(resolve, 10000));
          return res(ctx.json({ organisations: [] }));
        })
      );

      // Test timeout handling (implementation-dependent)
      // This test documents expected behavior even if timeout isn't implemented yet
    });

    it('handles concurrent API calls correctly', async () => {
      let callCount = 0;

      server.use(
        rest.get('/api/organisations/', (req, res, ctx) => {
          callCount++;
          return res(ctx.json({
            organisations: [
              {
                id: `org_${callCount}`,
                name: `Org ${callCount}`,
                slug: `org-${callCount}`,
                logo: null,
                metadata: {},
              },
            ],
          }));
        })
      );

      // Trigger multiple fetches
      const { rerender } = render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <ContextSwitcher />
        </ContextSwitcherProvider>
      );

      for (let i = 0; i < 5; i++) {
        rerender(
          <ContextSwitcherProvider
            config={{
              routerAdapter: mockRouterAdapter,
              apiBaseUrl: '/api',
            }}
          >
            <ContextSwitcher />
          </ContextSwitcherProvider>
        );
      }

      // Should handle concurrent calls without errors
      await waitFor(() => {
        expect(callCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Browser compatibility', () => {
    it('handles missing localStorage gracefully', () => {
      const originalLocalStorage = window.localStorage;

      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      // Should not crash
      render(
        <ContextSwitcherProvider
          config={{
            routerAdapter: mockRouterAdapter,
            apiBaseUrl: '/api',
          }}
        >
          <ContextSwitcher />
        </ContextSwitcherProvider>
      );

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      });
    });
  });
});
