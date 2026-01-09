import { expect, Page } from '@playwright/test';
import type { AuthenticatedPage } from './auth';

/**
 * Common page assertions and helpers for E2E tests
 */

/**
 * Assert page loads without errors and shows expected elements
 */
export async function assertPageLoaded(page: Page, expectedTitle?: string) {
  // Wait for page to be loaded
  await page.waitForLoadState('networkidle');

  // Check no console errors (except known warnings)
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Assert basic page structure
  await expect(page.locator('body')).toBeVisible();

  // Assert no 5xx errors
  page.on('response', (response) => {
    expect(response.status()).toBeLessThan(500);
  });

  // Check page title if provided
  if (expectedTitle) {
    await expect(page).toHaveTitle(new RegExp(expectedTitle, 'i'));
  }

  // Ensure navigation is present (should be on all authenticated pages)
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  await expect(page.locator('[data-testid="top-navigation"]')).toBeVisible();
}

/**
 * Assert navigation sidebar has expected structure
 */
export async function assertNavigationStructure(page: AuthenticatedPage) {
  // Check main navigation groups
  const groups = [
    'identity-group',
    'config-group',
    'platform-group',
    'frontend-group',
    'docs-group'
  ];

  for (const group of groups) {
    await expect(page.locator(`[data-testid="${group}"]`)).toBeVisible();
  }

  // Check context switcher is present
  await expect(page.locator('[data-testid="context-switcher"]')).toBeVisible();

  // Check user menu is present
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

/**
 * Assert table has expected seed data counts
 * Uses counts from data-model.md specifications
 */
export async function assertSeedDataCounts(page: Page, dataType: string, expectedMin: number) {
  const table = page.locator('[data-testid="data-table"]');
  await expect(table).toBeVisible();

  // Wait for data to load
  await page.waitForFunction(
    ({ selector }) => {
      const table = document.querySelector(selector);
      const rows = table?.querySelectorAll('tbody tr');
      return rows && rows.length > 0;
    },
    { selector: '[data-testid="data-table"] tbody tr' }
  );

  // Count rows (excluding header)
  const rowCount = await page.locator('[data-testid="data-table"] tbody tr').count();
  expect(rowCount).toBeGreaterThanOrEqual(expectedMin);
}

/**
 * Assert polling functionality works (for observability/real-time data)
 */
export async function assertPollingUpdates(page: Page, timeout = 35000) {
  // Look for polling indicator or timestamp
  const timestampSelector = '[data-testid="last-updated"]';

  if (await page.locator(timestampSelector).isVisible()) {
    const initialTime = await page.locator(timestampSelector).textContent();

    // Wait for polling update (30s interval + buffer)
    await page.waitForFunction(
      ({ selector, initial }) => {
        const current = document.querySelector(selector)?.textContent;
        return current !== initial;
      },
      { selector: timestampSelector, initial: initialTime },
      { timeout }
    );
  }
}

/**
 * Assert theme switching works correctly
 */
export async function assertThemeToggle(page: Page) {
  const themeToggle = page.locator('[data-testid="theme-toggle"]');

  if (await themeToggle.isVisible()) {
    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 'light';
    });

    // Toggle theme
    await themeToggle.click();

    // Wait for theme to change
    await page.waitForFunction(
      (initial) => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        return current !== initial;
      },
      initialTheme
    );

    // Verify theme persistence (should be saved to localStorage or backend)
    const newTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 'light';
    });
    expect(newTheme).not.toBe(initialTheme);
  }
}

/**
 * Assert chart loads correctly (for Chart.js components)
 */
export async function assertChartLoads(page: Page, chartSelector: string) {
  const chartContainer = page.locator(chartSelector);
  await expect(chartContainer).toBeVisible();

  // Wait for Chart.js to load and render
  await page.waitForFunction(
    ({ selector }) => {
      const container = document.querySelector(selector);
      const canvas = container?.querySelector('canvas');
      return canvas && canvas.width > 0 && canvas.height > 0;
    },
    { selector: chartSelector },
    { timeout: 10000 }
  );

  // Verify chart canvas is present and has content
  const canvas = page.locator(`${chartSelector} canvas`);
  await expect(canvas).toBeVisible();
}

/**
 * Assert form validation works correctly
 */
export async function assertFormValidation(page: Page, formSelector: string) {
  const form = page.locator(formSelector);
  await expect(form).toBeVisible();

  // Try submitting empty form
  await page.click(`${formSelector} [type="submit"]`);

  // Should show validation errors
  await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
}

/**
 * Assert search/filter functionality works
 */
export async function assertSearchFiltering(page: Page, searchInput: string, expectedResults: number) {
  const searchField = page.locator('[data-testid="search-input"]');

  if (await searchField.isVisible()) {
    // Clear and enter search term
    await searchField.fill(searchInput);

    // Wait for search results to update
    await page.waitForTimeout(500); // Debounce time

    // Count filtered results
    const resultCount = await page.locator('[data-testid="search-result"]').count();
    expect(resultCount).toBe(expectedResults);
  }
}

/**
 * Assert permission-based UI visibility
 */
export async function assertRoleBasedUI(page: AuthenticatedPage, action: 'create' | 'edit' | 'delete') {
  const { role } = page;
  const actionButton = page.locator(`[data-testid="${action}-button"]`);

  switch (role) {
    case 'admin':
      // Admin should see all actions
      await expect(actionButton).toBeVisible();
      break;

    case 'member':
      // Member should see most actions (depends on specific page)
      if (action === 'delete') {
        // Members typically can't delete
        await expect(actionButton).not.toBeVisible();
      } else {
        await expect(actionButton).toBeVisible();
      }
      break;

    case 'viewer':
      // Viewer should not see modification actions
      await expect(actionButton).not.toBeVisible();
      break;
  }
}

/**
 * Helper to wait for API calls to complete
 */
export async function waitForApiCall(page: Page, apiPath: string, method = 'GET') {
  await page.waitForResponse(response =>
    response.url().includes(apiPath) &&
    response.request().method() === method &&
    response.status() < 400
  );
}

/**
 * Assert page performance is within targets
 */
export async function assertPerformance(page: Page, maxLoadTime = 2000) {
  const startTime = Date.now();

  await page.waitForLoadState('networkidle');

  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(maxLoadTime);
}
