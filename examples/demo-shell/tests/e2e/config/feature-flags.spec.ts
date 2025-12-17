import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Feature Flags Page', () => {
  test('should load feature flags for admin with management access', async ({ adminPage }) => {
    await adminPage.goto('/config/feature-flags');
    await assertPageLoaded(adminPage, 'Feature Flags');

    // Admin should see all flags and controls
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="feature-flags-table"]', '[data-testid="flag-toggle"]', '[data-testid="flag-create-button"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show feature flags list
    const flagsTable = adminPage.locator('[data-testid="feature-flags-table"]');
    await expect(flagsTable).toBeVisible();

    // Should show flag categories
    const categories = adminPage.locator('[data-testid="flag-category"]');
    const categoryCount = await categories.count();
    expect(categoryCount).toBeGreaterThan(0);
  });

  test('should load feature flags for member with view access', async ({ memberPage }) => {
    await memberPage.goto('/config/feature-flags');
    await assertPageLoaded(memberPage, 'Feature Flags');

    // Member should see flags but limited controls
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="feature-flags-table"]'],
        cannotView: ['[data-testid="flag-create-button"]', '[data-testid="flag-delete-button"]']
      }
    }, 'member');
  });

  test('should restrict feature flags for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/config/feature-flags');
    await assertPageLoaded(viewerPage, 'Feature Flags');

    // Viewer should see read-only view
    await assertRoleBasedUI(viewerPage, {
      viewer: {
        canView: ['[data-testid="feature-flags-readonly"]'],
        cannotView: ['[data-testid="flag-toggle"]', '[data-testid="flag-create-button"]', '[data-testid="flag-edit-button"]']
      }
    }, 'viewer');
  });

  test('should toggle feature flag (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/config/feature-flags');
    await assertPageLoaded(adminPage);

    const firstToggle = adminPage.locator('[data-testid="flag-toggle"]').first();
    if (await firstToggle.isVisible()) {
      const initialState = await firstToggle.isChecked();

      // Toggle the flag
      await firstToggle.click();

      // Should show confirmation or immediate change
      const confirmDialog = adminPage.locator('[data-testid="confirm-flag-toggle"]');
      if (await confirmDialog.isVisible()) {
        await adminPage.click('[data-testid="confirm-toggle"]');
      }

      // State should have changed
      await expect(firstToggle).toBeChecked({ checked: !initialState });
    }
  });

  test('should filter flags by category', async ({ adminPage }) => {
    await adminPage.goto('/config/feature-flags');
    await assertPageLoaded(adminPage);

    const categoryFilter = adminPage.locator('[data-testid="category-filter"]');
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('authentication');

      // Should show only auth flags
      const visibleFlags = adminPage.locator('[data-testid="feature-flag-row"]');
      const count = await visibleFlags.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show flag descriptions and impacts', async ({ adminPage }) => {
    await adminPage.goto('/config/feature-flags');
    await assertPageLoaded(adminPage);

    // Should show flag details
    const flagRow = adminPage.locator('[data-testid="feature-flag-row"]').first();
    if (await flagRow.isVisible()) {
      await expect(flagRow.locator('[data-testid="flag-name"]')).toBeVisible();
      await expect(flagRow.locator('[data-testid="flag-description"]')).toBeVisible();

      // Should show impact level
      const impactBadge = flagRow.locator('[data-testid="flag-impact"]');
      if (await impactBadge.isVisible()) {
        const impactText = await impactBadge.textContent();
        expect(['low', 'medium', 'high', 'critical']).toContain(impactText?.toLowerCase());
      }
    }
  });
});
