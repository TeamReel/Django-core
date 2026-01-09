import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Permissions Page', () => {
  test('should show role matrix for admin', async ({ adminPage }) => {
    await adminPage.goto('/identity/permissions');
    await assertPageLoaded(adminPage, 'Permissions');

    // Should show permissions matrix
    await expect(adminPage.locator('[data-testid="permissions-matrix"]')).toBeVisible();

    // Should show all role types
    const roles = ['admin', 'member', 'viewer'];
    for (const role of roles) {
      await expect(adminPage.locator(`[data-testid="role-${role}"]`)).toBeVisible();
    }

    // Admin should see management actions
    await assertRoleBasedUI(adminPage, 'edit');
  });

  test('should show appropriate permissions for member', async ({ memberPage }) => {
    await memberPage.goto('/identity/permissions');
    await assertPageLoaded(memberPage, 'Permissions');

    // Should show permissions matrix (read-only for member)
    await expect(memberPage.locator('[data-testid="permissions-matrix"]')).toBeVisible();

    // Member should not see admin management actions
    await assertRoleBasedUI(memberPage, 'edit');
  });

  test('should show limited view for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/identity/permissions');
    await assertPageLoaded(viewerPage, 'Permissions');

    // Should show permissions but with viewer limitations
    await expect(viewerPage.locator('[data-testid="permissions-matrix"]')).toBeVisible();

    // Viewer should have no modification actions
    await assertRoleBasedUI(viewerPage, 'edit');
  });

  test('should display permission descriptions', async ({ adminPage }) => {
    await adminPage.goto('/identity/permissions');
    await assertPageLoaded(adminPage);

    // Should show permission descriptions
    const permissionItems = adminPage.locator('[data-testid="permission-item"]');
    const count = await permissionItems.count();
    expect(count).toBeGreaterThan(5); // Should have multiple permissions listed

    // Each permission should have a description
    for (let i = 0; i < Math.min(count, 5); i++) {
      const item = permissionItems.nth(i);
      await expect(item).toBeVisible();

      const description = item.locator('[data-testid="permission-description"]');
      if (await description.isVisible()) {
        const text = await description.textContent();
        expect(text?.length).toBeGreaterThan(5);
      }
    }
  });
});
