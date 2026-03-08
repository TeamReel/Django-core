/**
 * Test render utility — wraps components in the same providers used in production.
 *
 * ```tsx
 * import { renderWithProviders } from '@/test/render';
 *
 * it('renders project name', () => {
 *   const { getByText } = renderWithProviders(<ProjectCard project={mockProject} />);
 *   expect(getByText('FC Test')).toBeInTheDocument();
 * });
 * ```
 */

import React, { type PropsWithChildren, type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Minimal test providers                                             */
/* ------------------------------------------------------------------ */

interface TestProviderProps extends PropsWithChildren {
  routerProps?: MemoryRouterProps;
}

/**
 * Minimal provider tree for unit tests.
 *
 * Intentionally slim — only includes `MemoryRouter` by default.
 * Individual tests can supply additional wrappers as needed.
 *
 * Auth, Theme, Season contexts are NOT included here because they
 * have side-effects (API calls, localStorage). Tests that need them
 * should mock the relevant hooks instead.
 */
function TestProviders({ children, routerProps }: TestProviderProps) {
  return (
    <MemoryRouter {...routerProps}>
      {children}
    </MemoryRouter>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom render                                                      */
/* ------------------------------------------------------------------ */

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Props forwarded to `<MemoryRouter>`. */
  routerProps?: MemoryRouterProps;
}

/**
 * Drop-in replacement for `@testing-library/react` `render()` that wraps
 * the component in the standard test provider tree.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions,
) {
  const { routerProps, ...renderOpts } = options ?? {};
  const Wrapper = ({ children }: PropsWithChildren) => (
    <TestProviders routerProps={routerProps}>{children}</TestProviders>
  );
  return render(ui, { wrapper: Wrapper, ...renderOpts });
}

export { TestProviders };
