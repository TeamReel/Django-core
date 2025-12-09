/**
 * jest-axe configuration for accessibility testing.
 *
 * Provides a configured axe instance for use in component accessibility tests.
 * Tests against WCAG 2.1 AA standards.
 *
 * @see https://github.com/nickcolley/jest-axe
 */

import { configureAxe } from 'jest-axe';

/**
 * Configured axe instance for accessibility testing.
 *
 * Default configuration tests against WCAG 2.1 AA standards.
 * Can be customized to disable specific rules if needed (e.g., for known F01 issues).
 *
 * @example
 * ```typescript
 * import { axe } from '@/tests/helpers/axe';
 * import { render } from '@testing-library/react';
 *
 * it('has no accessibility violations', async () => {
 *   const { container } = render(<MyComponent />);
 *   const results = await axe(container);
 *   expect(results).toHaveNoViolations();
 * });
 * ```
 */
export const axe = configureAxe({
  rules: {
    // Customize rules here if needed
    // Example: Disable specific rules for known F01 design system issues
    // 'color-contrast': { enabled: false },
  },
});
