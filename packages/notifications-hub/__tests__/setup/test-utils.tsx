import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TestProviders } from './test-providers';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: any;
  contextValue?: any;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  const { authValue, contextValue, ...renderOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TestProviders authValue={authValue} contextValue={contextValue}>
        {children}
      </TestProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { renderWithProviders as render };
