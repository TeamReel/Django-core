/**
 * Tests for useContextSwitcher hook.
 */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useContextSwitcher } from '../useContextSwitcher';
import { ContextSwitcherProvider } from '../../context/ContextSwitcherProvider';
import type { ContextSwitcherConfig } from '../../types';

describe('useContextSwitcher', () => {
  let mockConfig: ContextSwitcherConfig;

  beforeEach(() => {
    // Mock fetch globally
    globalThis.fetch = jest.fn();

    mockConfig = {
      routerAdapter: {
        getCurrentPath: (): string => '/',
        navigateTo: jest.fn(),
        buildPathForContext: (ctx): string =>
          ctx.projectSlug
            ? `/${ctx.orgSlug}/${ctx.projectSlug}`
            : `/${ctx.orgSlug}`,
      },
      apiBaseUrl: '/api/v1',
    };
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useContextSwitcher());
    }).toThrow('useContextSwitcher must be used within a ContextSwitcherProvider');
  });

  it('provides context value when used inside provider', async () => {
    // Mock fetch responses
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: (): Promise<never[]> => Promise.resolve([]),
    });

    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <ContextSwitcherProvider config={mockConfig}>
        {children}
      </ContextSwitcherProvider>
    );

    const { result } = renderHook<ReturnType<typeof useContextSwitcher>, unknown>(
      () => useContextSwitcher(),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.context.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty('context');
    expect(result.current).toHaveProperty('switchContext');
    expect(result.current).toHaveProperty('switchProject');
    expect(result.current).toHaveProperty('refresh');
  });
});
