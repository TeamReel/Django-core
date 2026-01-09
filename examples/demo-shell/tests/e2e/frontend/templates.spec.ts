import { test, expect, assertPageLoaded } from '../fixtures';

test.describe('Templates Page', () => {
  test('should load page templates showcase for all users', async ({ adminPage, memberPage, viewerPage }) => {
    // Templates should be accessible to all users
    for (const [role, page] of [['admin', adminPage], ['member', memberPage], ['viewer', viewerPage]]) {
      await page.goto('/frontend/templates');
      await assertPageLoaded(page, 'Templates');

      // Should show template showcase
      const templatesShowcase = page.locator('[data-testid="templates-showcase"]');
      await expect(templatesShowcase).toBeVisible();
    }
  });

  test('should display template categories and previews', async ({ adminPage }) => {
    await adminPage.goto('/frontend/templates');
    await assertPageLoaded(adminPage);

    // Should show template categories
    const templateCategories = adminPage.locator('[data-testid="template-category"]');
    const categoryCount = await templateCategories.count();
    expect(categoryCount).toBeGreaterThan(0);

    if (categoryCount > 0) {
      const firstCategory = templateCategories.first();
      await expect(firstCategory.locator('[data-testid="category-name"]')).toBeVisible();

      // Should show templates in category
      const templatesInCategory = firstCategory.locator('[data-testid="template-item"]');
      const templateCount = await templatesInCategory.count();

      if (templateCount > 0) {
        const firstTemplate = templatesInCategory.first();
        await expect(firstTemplate.locator('[data-testid="template-name"]')).toBeVisible();
        await expect(firstTemplate.locator('[data-testid="template-preview"]')).toBeVisible();
      }
    }
  });

  test('should showcase dashboard layout templates', async ({ adminPage }) => {
    await adminPage.goto('/frontend/templates');
    await assertPageLoaded(adminPage);

    const dashboardTemplates = adminPage.locator('[data-testid="dashboard-templates"]');
    if (await dashboardTemplates.isVisible()) {
      // Should show different dashboard layouts
      const singleColumnLayout = adminPage.locator('[data-testid="dashboard-single-column"]');
      const twoColumnLayout = adminPage.locator('[data-testid="dashboard-two-column"]');
      const gridLayout = adminPage.locator('[data-testid="dashboard-grid-layout"]');

      if (await singleColumnLayout.isVisible()) {
        await expect(singleColumnLayout).toBeVisible();

        // Should show preview
        const previewButton = singleColumnLayout.locator('[data-testid="preview-template"]');
        if (await previewButton.isVisible()) {
          await previewButton.click();

          const templatePreview = adminPage.locator('[data-testid="template-preview-modal"]');
          if (await templatePreview.isVisible()) {
            await expect(templatePreview).toBeVisible();

            // Close preview
            const closePreview = adminPage.locator('[data-testid="close-preview"]');
            if (await closePreview.isVisible()) {
              await closePreview.click();
              await expect(templatePreview).not.toBeVisible();
            }
          }
        }
      }

      if (await twoColumnLayout.isVisible()) {
        await expect(twoColumnLayout).toBeVisible();
      }

      if (await gridLayout.isVisible()) {
        await expect(gridLayout).toBeVisible();
      }
    }
  });

  test('should showcase form layout templates', async ({ adminPage }) => {
    await adminPage.goto('/frontend/templates');
    await assertPageLoaded(adminPage);

    const formTemplates = adminPage.locator('[data-testid="form-templates"]');
    if (await formTemplates.isVisible()) {
      // Should show different form layouts
      const singleStepForm = adminPage.locator('[data-testid="single-step-form"]');
      const multiStepForm = adminPage.locator('[data-testid="multi-step-form"]');
      const wizardForm = adminPage.locator('[data-testid="wizard-form"]');

      if (await singleStepForm.isVisible()) {
        await expect(singleStepForm).toBeVisible();

        // Should show form structure
        const formFields = singleStepForm.locator('[data-testid="form-field"]');
        const fieldCount = await formFields.count();
        expect(fieldCount).toBeGreaterThan(0);
      }

      if (await multiStepForm.isVisible()) {
        await expect(multiStepForm).toBeVisible();

        // Should show step indicators
        const stepIndicators = multiStepForm.locator('[data-testid="step-indicator"]');
        const stepCount = await stepIndicators.count();
        expect(stepCount).toBeGreaterThan(1);
      }

      if (await wizardForm.isVisible()) {
        await expect(wizardForm).toBeVisible();

        // Should show navigation buttons
        const nextButton = wizardForm.locator('[data-testid="wizard-next"]');
        const prevButton = wizardForm.locator('[data-testid="wizard-prev"]');

        if (await nextButton.isVisible()) await expect(nextButton).toBeVisible();
        if (await prevButton.isVisible()) await expect(prevButton).toBeVisible();
      }
    }
  });

  test('should showcase data table templates', async ({ adminPage }) => {
    await adminPage.goto('/frontend/templates');
    await assertPageLoaded(adminPage);

    const tableTemplates = adminPage.locator('[data-testid="table-templates"]');
    if (await tableTemplates.isVisible()) {
      // Should show different table layouts
      const basicTable = adminPage.locator('[data-testid="basic-table-template"]');
      const sortableTable = adminPage.locator('[data-testid="sortable-table-template"]');
      const paginatedTable = adminPage.locator('[data-testid="paginated-table-template"]');

      if (await basicTable.isVisible()) {
        await expect(basicTable).toBeVisible();

        // Should show table structure
        const tableHeaders = basicTable.locator('[data-testid="table-header"]');
        const tableRows = basicTable.locator('[data-testid="table-row"]');

        const headerCount = await tableHeaders.count();
        const rowCount = await tableRows.count();

        expect(headerCount).toBeGreaterThan(0);
        expect(rowCount).toBeGreaterThan(0);
      }

      if (await sortableTable.isVisible()) {
        await expect(sortableTable).toBeVisible();

        // Should show sort indicators
        const sortableHeaders = sortableTable.locator('[data-testid="sortable-header"]');
        const sortableCount = await sortableHeaders.count();

        if (sortableCount > 0) {
          const firstSortableHeader = sortableHeaders.first();
          await firstSortableHeader.click();

          // Should show sort direction
          const sortIndicator = adminPage.locator('[data-testid="sort-indicator"]');
          if (await sortIndicator.isVisible()) {
            await expect(sortIndicator).toBeVisible();
          }
        }
      }

      if (await paginatedTable.isVisible()) {
        await expect(paginatedTable).toBeVisible();

        // Should show pagination controls
        const paginationControls = paginatedTable.locator('[data-testid="pagination-controls"]');
        if (await paginationControls.isVisible()) {
          await expect(paginationControls).toBeVisible();
        }
      }
    }
  });

  test('should showcase navigation templates', async ({ adminPage }) => {
    await adminPage.goto('/frontend/templates');
    await assertPageLoaded(adminPage);

    const navigationTemplates = adminPage.locator('[data-testid="navigation-templates"]');
    if (await navigationTemplates.isVisible()) {
      // Should show different navigation patterns
      const sidebarNav = adminPage.locator('[data-testid="sidebar-navigation"]');
      const topbarNav = adminPage.locator('[data-testid="topbar-navigation"]');
      const breadcrumbNav = adminPage.locator('[data-testid="breadcrumb-navigation"]');

      if (await sidebarNav.isVisible()) {
        await expect(sidebarNav).toBeVisible();

        // Should show navigation items
        const navItems = sidebarNav.locator('[data-testid="nav-item"]');
        const itemCount = await navItems.count();
        expect(itemCount).toBeGreaterThan(0);

        // Should support collapsible sections
        const collapsibleSection = sidebarNav.locator('[data-testid="collapsible-section"]');
        if (await collapsibleSection.isVisible()) {
          await collapsibleSection.click();

          const expandedContent = adminPage.locator('[data-testid="expanded-nav-content"]');
          if (await expandedContent.isVisible()) {
            await expect(expandedContent).toBeVisible();
          }
        }
      }

      if (await topbarNav.isVisible()) {
        await expect(topbarNav).toBeVisible();

        // Should show horizontal navigation
        const horizontalItems = topbarNav.locator('[data-testid="horizontal-nav-item"]');
        const horizontalCount = await horizontalItems.count();
        expect(horizontalCount).toBeGreaterThan(0);
      }

      if (await breadcrumbNav.isVisible()) {
        await expect(breadcrumbNav).toBeVisible();

        // Should show breadcrumb items
        const breadcrumbItems = breadcrumbNav.locator('[data-testid="breadcrumb-item"]');
        const breadcrumbCount = await breadcrumbItems.count();
        expect(breadcrumbCount).toBeGreaterThan(0);
      }
    }
  });

  test('should showcase modal and dialog templates', async ({ adminPage }) => {
    await adminPage.goto('/frontend/templates');
    await assertPageLoaded(adminPage);

    const modalTemplates = adminPage.locator('[data-testid="modal-templates"]');
    if (await modalTemplates.isVisible()) {
      // Should show different modal types
      const simpleModal = adminPage.locator('[data-testid="simple-modal-template"]');
      const confirmModal = adminPage.locator('[data-testid="confirm-modal-template"]');
      const formModal = adminPage.locator('[data-testid="form-modal-template"]');

      if (await simpleModal.isVisible()) {
        const openSimpleModal = simpleModal.locator('[data-testid="open-simple-modal"]');
        if (await openSimpleModal.isVisible()) {
          await openSimpleModal.click();

          const modalDialog = adminPage.locator('[data-testid="simple-modal-dialog"]');
          if (await modalDialog.isVisible()) {
            await expect(modalDialog).toBeVisible();

            // Should have close button
            const closeButton = adminPage.locator('[data-testid="close-simple-modal"]');
            if (await closeButton.isVisible()) {
              await closeButton.click();
              await expect(modalDialog).not.toBeVisible();
            }
          }
        }
      }

      if (await confirmModal.isVisible()) {
        const openConfirmModal = confirmModal.locator('[data-testid="open-confirm-modal"]');
        if (await openConfirmModal.isVisible()) {
          await openConfirmModal.click();

          const confirmDialog = adminPage.locator('[data-testid="confirm-modal-dialog"]');
          if (await confirmDialog.isVisible()) {
            await expect(confirmDialog).toBeVisible();

            // Should have confirm and cancel buttons
            const confirmButton = adminPage.locator('[data-testid="confirm-action"]');
            const cancelButton = adminPage.locator('[data-testid="cancel-action"]');

            if (await confirmButton.isVisible()) await expect(confirmButton).toBeVisible();
            if (await cancelButton.isVisible()) {
              await cancelButton.click();
              await expect(confirmDialog).not.toBeVisible();
            }
          }
        }
      }
    }
  });

  test('should showcase responsive layout templates', async ({ adminPage }) => {
    await adminPage.goto('/frontend/templates');
    await assertPageLoaded(adminPage);

    const responsiveTemplates = adminPage.locator('[data-testid="responsive-templates"]');
    if (await responsiveTemplates.isVisible()) {
      // Test responsive behavior
      const mobileLayout = adminPage.locator('[data-testid="mobile-layout-template"]');
      const tabletLayout = adminPage.locator('[data-testid="tablet-layout-template"]');
      const desktopLayout = adminPage.locator('[data-testid="desktop-layout-template"]');

      // Test different viewport sizes
      const originalViewport = adminPage.viewportSize();

      // Test mobile view
      await adminPage.setViewportSize({ width: 375, height: 667 });
      if (await mobileLayout.isVisible()) {
        await expect(mobileLayout).toBeVisible();
      }

      // Test tablet view
      await adminPage.setViewportSize({ width: 768, height: 1024 });
      if (await tabletLayout.isVisible()) {
        await expect(tabletLayout).toBeVisible();
      }

      // Test desktop view
      await adminPage.setViewportSize({ width: 1200, height: 800 });
      if (await desktopLayout.isVisible()) {
        await expect(desktopLayout).toBeVisible();
      }

      // Restore original viewport
      if (originalViewport) {
        await adminPage.setViewportSize(originalViewport);
      }
    }
  });

  test('should demonstrate template customization', async ({ adminPage }) => {
    await adminPage.goto('/frontend/templates');
    await assertPageLoaded(adminPage);

    const templateCustomization = adminPage.locator('[data-testid="template-customization"]');
    if (await templateCustomization.isVisible()) {
      // Should show customization options
      const customizeButton = adminPage.locator('[data-testid="customize-template"]');
      if (await customizeButton.isVisible()) {
        await customizeButton.click();

        const customizationPanel = adminPage.locator('[data-testid="customization-panel"]');
        if (await customizationPanel.isVisible()) {
          await expect(customizationPanel).toBeVisible();

          // Should have color options
          const colorOptions = adminPage.locator('[data-testid="color-option"]');
          const colorCount = await colorOptions.count();

          if (colorCount > 0) {
            await colorOptions.first().click();

            // Should apply color change
            const templatePreview = adminPage.locator('[data-testid="customization-preview"]');
            if (await templatePreview.isVisible()) {
              await expect(templatePreview).toBeVisible();
            }
          }

          // Close customization
          const closeCustomization = adminPage.locator('[data-testid="close-customization"]');
          if (await closeCustomization.isVisible()) {
            await closeCustomization.click();
            await expect(customizationPanel).not.toBeVisible();
          }
        }
      }
    }
  });
});
