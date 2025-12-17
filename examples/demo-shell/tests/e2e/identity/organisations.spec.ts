import { test, expect, assertPageLoaded, assertSeedDataCounts, assertRoleBasedUI } from '../fixtures';

test.describe('Organisations Page', () => {
  test('should load organisations list for admin', async ({ adminPage }) => {
    await adminPage.goto('/identity/organisations');
    await assertPageLoaded(adminPage, 'Organisations');

    // Should show organisations table with seed data (5+ orgs expected)
    await assertSeedDataCounts(adminPage, 'organisations', 5);

    // Admin should see create/edit actions
    await assertRoleBasedUI(adminPage, 'create');
    await assertRoleBasedUI(adminPage, 'edit');
  });

  test('should load organisations list for member', async ({ memberPage }) => {
    await memberPage.goto('/identity/organisations');
    await assertPageLoaded(memberPage, 'Organisations');

    // Should show same data but limited actions
    await assertSeedDataCounts(memberPage, 'organisations', 5);

    // Member should not see admin actions
    await assertRoleBasedUI(memberPage, 'create');
  });

  test('should load organisations list for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/identity/organisations');
    await assertPageLoaded(viewerPage, 'Organisations');

    // Should show data but no modification actions
    await assertSeedDataCounts(viewerPage, 'organisations', 5);

    // Viewer should only be able to view
    await assertRoleBasedUI(viewerPage, 'create');
    await assertRoleBasedUI(viewerPage, 'edit');
  });

  test('should support sorting and filtering', async ({ adminPage }) => {
    await adminPage.goto('/identity/organisations');
    await assertPageLoaded(adminPage);

    // Test sorting (if available)
    const sortButton = adminPage.locator('[data-testid="sort-button"]');
    if (await sortButton.isVisible()) {
      await sortButton.click();

      // Wait for sort to apply
      await adminPage.waitForTimeout(500);

      // Verify table is still populated
      await expect(adminPage.locator('[data-testid="data-table"] tbody tr')).not.toHaveCount(0);
    }

    // Test search filtering (if available)
    const searchInput = adminPage.locator('[data-testid="search-input"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Demo');
      await adminPage.waitForTimeout(500);

      // Should still show results (assuming "Demo" appears in seed data)
      await expect(adminPage.locator('[data-testid="data-table"] tbody tr')).not.toHaveCount(0);
    }
  });

  test('should navigate to organisation detail', async ({ adminPage }) => {
    await adminPage.goto('/identity/organisations');
    await assertPageLoaded(adminPage);

    // Click first organisation link
    const firstOrgLink = adminPage.locator('[data-testid="org-link"]').first();
    if (await firstOrgLink.isVisible()) {
      await firstOrgLink.click();

      // Should navigate to organisation detail page
      await adminPage.waitForURL(/\/identity\/organisations\/\d+/);
      await assertPageLoaded(adminPage, 'Organisation');
    }
  });
});
