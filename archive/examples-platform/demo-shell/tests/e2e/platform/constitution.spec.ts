import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Constitution Page', () => {
  test('should load constitution for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/platform/constitution');
    await assertPageLoaded(adminPage, 'Constitution');

    // Admin should see all constitution features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="constitution-content"]', '[data-testid="policy-search"]', '[data-testid="policy-editor"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show constitution sections
    const constitutionContent = adminPage.locator('[data-testid="constitution-content"]');
    await expect(constitutionContent).toBeVisible();

    // Should show table of contents
    const toc = adminPage.locator('[data-testid="constitution-toc"]');
    await expect(toc).toBeVisible();
  });

  test('should load constitution for member with read access', async ({ memberPage }) => {
    await memberPage.goto('/platform/constitution');
    await assertPageLoaded(memberPage, 'Constitution');

    // Member should see content but no editing
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="constitution-content"]', '[data-testid="policy-search"]'],
        cannotView: ['[data-testid="policy-editor"]', '[data-testid="edit-policy-button"]']
      }
    }, 'member');
  });

  test('should load constitution for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/platform/constitution');
    await assertPageLoaded(viewerPage, 'Constitution');

    // Viewer should see basic content
    await assertRoleBasedUI(viewerPage, {
      viewer: {
        canView: ['[data-testid="constitution-content"]'],
        cannotView: ['[data-testid="policy-editor"]', '[data-testid="advanced-search"]']
      }
    }, 'viewer');
  });

  test('should display policy sections and principles', async ({ adminPage }) => {
    await adminPage.goto('/platform/constitution');
    await assertPageLoaded(adminPage);

    // Should show policy sections
    const policySections = adminPage.locator('[data-testid="policy-section"]');
    const sectionCount = await policySections.count();
    expect(sectionCount).toBeGreaterThan(0);

    if (sectionCount > 0) {
      const firstSection = policySections.first();
      await expect(firstSection.locator('[data-testid="section-title"]')).toBeVisible();
      await expect(firstSection.locator('[data-testid="section-content"]')).toBeVisible();
    }
  });

  test('should search constitution policies', async ({ adminPage }) => {
    await adminPage.goto('/platform/constitution');
    await assertPageLoaded(adminPage);

    const searchInput = adminPage.locator('[data-testid="policy-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('governance');
      await adminPage.press('[data-testid="policy-search"]', 'Enter');

      // Should show search results
      const searchResults = adminPage.locator('[data-testid="search-results"]');
      await expect(searchResults).toBeVisible();

      // Should highlight search terms
      const highlightedText = adminPage.locator('[data-testid="search-highlight"]');
      if (await highlightedText.count() > 0) {
        await expect(highlightedText.first()).toBeVisible();
      }
    }
  });

  test('should navigate table of contents', async ({ adminPage }) => {
    await adminPage.goto('/platform/constitution');
    await assertPageLoaded(adminPage);

    const tocItems = adminPage.locator('[data-testid="toc-item"]');
    const itemCount = await tocItems.count();

    if (itemCount > 0) {
      const firstTocItem = tocItems.first();
      const tocText = await firstTocItem.textContent();

      await firstTocItem.click();

      // Should scroll to corresponding section
      const targetSection = adminPage.locator(`[data-testid="section-${tocText?.toLowerCase().replace(/\s+/g, '-')}"]`);
      if (await targetSection.isVisible()) {
        await expect(targetSection).toBeInViewport();
      }
    }
  });

  test('should show policy revision history (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/platform/constitution');
    await assertPageLoaded(adminPage);

    const historyButton = adminPage.locator('[data-testid="view-history"]');
    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Should show revision history
      const historyPanel = adminPage.locator('[data-testid="policy-history"]');
      await expect(historyPanel).toBeVisible();

      // Should show revision entries
      const revisions = adminPage.locator('[data-testid="revision-item"]');
      const revisionCount = await revisions.count();

      if (revisionCount > 0) {
        const firstRevision = revisions.first();
        await expect(firstRevision.locator('[data-testid="revision-date"]')).toBeVisible();
        await expect(firstRevision.locator('[data-testid="revision-author"]')).toBeVisible();
      }
    }
  });

  test('should display policy enforcement status', async ({ adminPage }) => {
    await adminPage.goto('/platform/constitution');
    await assertPageLoaded(adminPage);

    const enforcementStatus = adminPage.locator('[data-testid="enforcement-status"]');
    if (await enforcementStatus.isVisible()) {
      // Should show enforcement indicators
      const statusItems = adminPage.locator('[data-testid="enforcement-item"]');
      const itemCount = await statusItems.count();

      if (itemCount > 0) {
        const firstItem = statusItems.first();
        await expect(firstItem.locator('[data-testid="policy-name"]')).toBeVisible();
        await expect(firstItem.locator('[data-testid="enforcement-level"]')).toBeVisible();

        const enforcementLevel = await firstItem.locator('[data-testid="enforcement-level"]').textContent();
        expect(['strict', 'advisory', 'disabled']).toContain(enforcementLevel?.toLowerCase());
      }
    }
  });

  test('should export constitution document', async ({ adminPage }) => {
    await adminPage.goto('/platform/constitution');
    await assertPageLoaded(adminPage);

    const exportButton = adminPage.locator('[data-testid="export-constitution"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Should show export options
      const exportDialog = adminPage.locator('[data-testid="export-options"]');
      if (await exportDialog.isVisible()) {
        // Should have format options
        const pdfOption = adminPage.locator('[data-testid="export-pdf"]');
        const markdownOption = adminPage.locator('[data-testid="export-markdown"]');

        await expect(pdfOption).toBeVisible();
        await expect(markdownOption).toBeVisible();

        // Cancel export
        const cancelButton = adminPage.locator('[data-testid="cancel-export"]');
        await cancelButton.click();
        await expect(exportDialog).not.toBeVisible();
      }
    }
  });

  test('should validate policy compliance', async ({ adminPage }) => {
    await adminPage.goto('/platform/constitution');
    await assertPageLoaded(adminPage);

    const complianceCheck = adminPage.locator('[data-testid="compliance-check"]');
    if (await complianceCheck.isVisible()) {
      await complianceCheck.click();

      // Should show compliance results
      const complianceResults = adminPage.locator('[data-testid="compliance-results"]');
      await expect(complianceResults).toBeVisible();

      // Should show compliance score
      const complianceScore = adminPage.locator('[data-testid="compliance-score"]');
      if (await complianceScore.isVisible()) {
        const scoreText = await complianceScore.textContent();
        expect(scoreText).toMatch(/\d+/); // Should contain numbers
      }
    }
  });
});
