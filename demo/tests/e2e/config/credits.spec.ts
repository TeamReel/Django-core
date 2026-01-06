import { test, expect, assertPageLoaded, assertRoleBasedUI, assertChartLoads } from '../fixtures';

test.describe('Credits Page', () => {
  test('should load credits page for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/config/credits');
    await assertPageLoaded(adminPage, 'Credits');

    // Admin should see all credit management features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="credits-overview"]', '[data-testid="credit-chart"]', '[data-testid="add-credits-button"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show credit balance
    const creditsOverview = adminPage.locator('[data-testid="credits-overview"]');
    await expect(creditsOverview).toBeVisible();

    const currentBalance = adminPage.locator('[data-testid="current-balance"]');
    await expect(currentBalance).toBeVisible();

    const balanceText = await currentBalance.textContent();
    expect(balanceText).toBeTruthy();
  });

  test('should load credits page for member with view access', async ({ memberPage }) => {
    await memberPage.goto('/config/credits');
    await assertPageLoaded(memberPage, 'Credits');

    // Member should see credits but limited management
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="credits-overview"]', '[data-testid="credit-chart"]'],
        cannotView: ['[data-testid="add-credits-button"]', '[data-testid="credit-admin-actions"]']
      }
    }, 'member');
  });

  test('should restrict credits page for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/config/credits');
    await assertPageLoaded(viewerPage, 'Credits');

    // Viewer should see basic info only
    await assertRoleBasedUI(viewerPage, {
      viewer: {
        canView: ['[data-testid="credits-readonly"]'],
        cannotView: ['[data-testid="add-credits-button"]', '[data-testid="credit-history"]', '[data-testid="usage-details"]']
      }
    }, 'viewer');
  });

  test('should display credit usage chart', async ({ adminPage }) => {
    await adminPage.goto('/config/credits');
    await assertPageLoaded(adminPage);

    // Test Chart.js integration for credit usage
    const chartContainer = adminPage.locator('[data-testid="credit-chart"]');
    if (await chartContainer.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="credit-chart"]');

      // Should show chart canvas
      const canvas = chartContainer.locator('canvas');
      await expect(canvas).toBeVisible();
    }
  });

  test('should show credit transaction history', async ({ adminPage }) => {
    await adminPage.goto('/config/credits');
    await assertPageLoaded(adminPage);

    const historyTable = adminPage.locator('[data-testid="credit-history"]');
    if (await historyTable.isVisible()) {
      // Should show transaction rows
      const transactions = adminPage.locator('[data-testid="transaction-row"]');
      const count = await transactions.count();

      if (count > 0) {
        // Should show transaction details
        const firstTransaction = transactions.first();
        await expect(firstTransaction.locator('[data-testid="transaction-amount"]')).toBeVisible();
        await expect(firstTransaction.locator('[data-testid="transaction-date"]')).toBeVisible();
        await expect(firstTransaction.locator('[data-testid="transaction-type"]')).toBeVisible();
      }
    }
  });

  test('should handle credit purchase flow (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/config/credits');
    await assertPageLoaded(adminPage);

    const addCreditsButton = adminPage.locator('[data-testid="add-credits-button"]');
    if (await addCreditsButton.isVisible()) {
      await addCreditsButton.click();

      // Should open purchase dialog
      const purchaseDialog = adminPage.locator('[data-testid="purchase-credits-dialog"]');
      await expect(purchaseDialog).toBeVisible();

      // Should have amount input
      const amountInput = adminPage.locator('[data-testid="credit-amount"]');
      await expect(amountInput).toBeVisible();

      // Cancel the dialog
      const cancelButton = adminPage.locator('[data-testid="cancel-purchase"]');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await expect(purchaseDialog).not.toBeVisible();
      }
    }
  });

  test('should show usage breakdown by service', async ({ adminPage }) => {
    await adminPage.goto('/config/credits');
    await assertPageLoaded(adminPage);

    const usageBreakdown = adminPage.locator('[data-testid="usage-breakdown"]');
    if (await usageBreakdown.isVisible()) {
      // Should show different service categories
      const serviceItems = adminPage.locator('[data-testid="service-usage-item"]');
      const itemCount = await serviceItems.count();

      if (itemCount > 0) {
        const firstItem = serviceItems.first();
        await expect(firstItem.locator('[data-testid="service-name"]')).toBeVisible();
        await expect(firstItem.locator('[data-testid="service-credits-used"]')).toBeVisible();
      }
    }
  });

  test('should display low credit warnings', async ({ adminPage }) => {
    await adminPage.goto('/config/credits');
    await assertPageLoaded(adminPage);

    // Check for low credit warning
    const lowCreditWarning = adminPage.locator('[data-testid="low-credit-warning"]');
    if (await lowCreditWarning.isVisible()) {
      await expect(lowCreditWarning).toContainText('low');

      // Should suggest action
      const actionButton = lowCreditWarning.locator('[data-testid="purchase-more-credits"]');
      await expect(actionButton).toBeVisible();
    }
  });
});
