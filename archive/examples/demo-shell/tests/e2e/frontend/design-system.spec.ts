import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Design System Page', () => {
  test('should load design system showcase for all roles', async ({ adminPage, memberPage, viewerPage }) => {
    // Design system should be accessible to all users
    for (const [role, page] of [['admin', adminPage], ['member', memberPage], ['viewer', viewerPage]]) {
      await page.goto('/frontend/design-system');
      await assertPageLoaded(page, 'Design System');

      // Should show design system components
      const componentShowcase = page.locator('[data-testid="component-showcase"]');
      await expect(componentShowcase).toBeVisible();
    }
  });

  test('should display component categories and navigation', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    // Should show component categories
    const categories = adminPage.locator('[data-testid="component-category"]');
    const categoryCount = await categories.count();
    expect(categoryCount).toBeGreaterThan(0);

    if (categoryCount > 0) {
      const firstCategory = categories.first();
      await expect(firstCategory.locator('[data-testid="category-title"]')).toBeVisible();

      // Should be able to navigate to category
      await firstCategory.click();

      const categoryContent = adminPage.locator('[data-testid="category-content"]');
      if (await categoryContent.isVisible()) {
        await expect(categoryContent).toBeVisible();
      }
    }
  });

  test('should showcase button components and variants', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    const buttonShowcase = adminPage.locator('[data-testid="button-showcase"]');
    if (await buttonShowcase.isVisible()) {
      // Should show different button variants
      const primaryButton = adminPage.locator('[data-testid="button-primary"]');
      const secondaryButton = adminPage.locator('[data-testid="button-secondary"]');
      const dangerButton = adminPage.locator('[data-testid="button-danger"]');

      if (await primaryButton.isVisible()) {
        await expect(primaryButton).toBeVisible();
        await expect(primaryButton).toBeEnabled();
      }

      if (await secondaryButton.isVisible()) {
        await expect(secondaryButton).toBeVisible();
      }

      // Should show button states
      const disabledButton = adminPage.locator('[data-testid="button-disabled"]');
      if (await disabledButton.isVisible()) {
        await expect(disabledButton).toBeDisabled();
      }
    }
  });

  test('should showcase form components', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    const formShowcase = adminPage.locator('[data-testid="form-showcase"]');
    if (await formShowcase.isVisible()) {
      // Should show different input types
      const textInput = adminPage.locator('[data-testid="input-text"]');
      const emailInput = adminPage.locator('[data-testid="input-email"]');
      const selectInput = adminPage.locator('[data-testid="input-select"]');
      const checkboxInput = adminPage.locator('[data-testid="input-checkbox"]');

      if (await textInput.isVisible()) {
        await textInput.fill('Test input');
        const inputValue = await textInput.inputValue();
        expect(inputValue).toBe('Test input');
      }

      if (await selectInput.isVisible()) {
        await selectInput.selectOption({ index: 1 });
        const selectedValue = await selectInput.inputValue();
        expect(selectedValue).toBeTruthy();
      }

      if (await checkboxInput.isVisible()) {
        await checkboxInput.check();
        await expect(checkboxInput).toBeChecked();
      }
    }
  });

  test('should showcase navigation components', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    const navigationShowcase = adminPage.locator('[data-testid="navigation-showcase"]');
    if (await navigationShowcase.isVisible()) {
      // Should show different navigation patterns
      const breadcrumbs = adminPage.locator('[data-testid="breadcrumbs-example"]');
      const tabs = adminPage.locator('[data-testid="tabs-example"]');
      const pagination = adminPage.locator('[data-testid="pagination-example"]');

      if (await breadcrumbs.isVisible()) {
        const breadcrumbItems = adminPage.locator('[data-testid="breadcrumb-item"]');
        const itemCount = await breadcrumbItems.count();
        expect(itemCount).toBeGreaterThan(0);
      }

      if (await tabs.isVisible()) {
        const tabButtons = adminPage.locator('[data-testid="tab-button"]');
        const tabCount = await tabButtons.count();

        if (tabCount > 1) {
          await tabButtons.nth(1).click();
          const secondTabContent = adminPage.locator('[data-testid="tab-content-1"]');
          if (await secondTabContent.isVisible()) {
            await expect(secondTabContent).toBeVisible();
          }
        }
      }
    }
  });

  test('should showcase data display components', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    const dataDisplayShowcase = adminPage.locator('[data-testid="data-display-showcase"]');
    if (await dataDisplayShowcase.isVisible()) {
      // Should show tables, cards, lists
      const tableExample = adminPage.locator('[data-testid="table-example"]');
      const cardExample = adminPage.locator('[data-testid="card-example"]');
      const listExample = adminPage.locator('[data-testid="list-example"]');

      if (await tableExample.isVisible()) {
        const tableRows = adminPage.locator('[data-testid="table-row"]');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThan(0);

        // Should show table headers
        const tableHeaders = adminPage.locator('[data-testid="table-header"]');
        const headerCount = await tableHeaders.count();
        expect(headerCount).toBeGreaterThan(0);
      }

      if (await cardExample.isVisible()) {
        await expect(cardExample.locator('[data-testid="card-title"]')).toBeVisible();
        await expect(cardExample.locator('[data-testid="card-content"]')).toBeVisible();
      }
    }
  });

  test('should showcase feedback components', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    const feedbackShowcase = adminPage.locator('[data-testid="feedback-showcase"]');
    if (await feedbackShowcase.isVisible()) {
      // Should show alerts, modals, tooltips
      const alertExample = adminPage.locator('[data-testid="alert-example"]');
      const modalTrigger = adminPage.locator('[data-testid="modal-trigger"]');
      const tooltipTrigger = adminPage.locator('[data-testid="tooltip-trigger"]');

      if (await alertExample.isVisible()) {
        await expect(alertExample).toBeVisible();

        // Should show different alert types
        const successAlert = adminPage.locator('[data-testid="alert-success"]');
        const errorAlert = adminPage.locator('[data-testid="alert-error"]');
        const warningAlert = adminPage.locator('[data-testid="alert-warning"]');

        if (await successAlert.isVisible()) await expect(successAlert).toBeVisible();
        if (await errorAlert.isVisible()) await expect(errorAlert).toBeVisible();
        if (await warningAlert.isVisible()) await expect(warningAlert).toBeVisible();
      }

      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();

        const modal = adminPage.locator('[data-testid="example-modal"]');
        if (await modal.isVisible()) {
          await expect(modal).toBeVisible();

          // Close modal
          const closeModal = adminPage.locator('[data-testid="close-modal"]');
          if (await closeModal.isVisible()) {
            await closeModal.click();
            await expect(modal).not.toBeVisible();
          }
        }
      }

      if (await tooltipTrigger.isVisible()) {
        await tooltipTrigger.hover();

        const tooltip = adminPage.locator('[data-testid="example-tooltip"]');
        if (await tooltip.isVisible()) {
          await expect(tooltip).toBeVisible();
        }
      }
    }
  });

  test('should show color palette and typography', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    const colorPalette = adminPage.locator('[data-testid="color-palette"]');
    if (await colorPalette.isVisible()) {
      // Should show primary colors
      const primaryColors = adminPage.locator('[data-testid="primary-color"]');
      const colorCount = await primaryColors.count();
      expect(colorCount).toBeGreaterThan(0);

      // Should show semantic colors
      const semanticColors = adminPage.locator('[data-testid="semantic-color"]');
      const semanticCount = await semanticColors.count();
      expect(semanticCount).toBeGreaterThan(0);
    }

    const typography = adminPage.locator('[data-testid="typography-showcase"]');
    if (await typography.isVisible()) {
      // Should show different text styles
      const headings = adminPage.locator('[data-testid="heading-example"]');
      const bodyText = adminPage.locator('[data-testid="body-text-example"]');

      if (await headings.isVisible()) {
        const headingCount = await headings.count();
        expect(headingCount).toBeGreaterThan(0);
      }

      if (await bodyText.isVisible()) {
        await expect(bodyText).toBeVisible();
      }
    }
  });

  test('should demonstrate responsive design', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    const responsiveDemo = adminPage.locator('[data-testid="responsive-demo"]');
    if (await responsiveDemo.isVisible()) {
      // Test different viewport sizes
      const originalViewport = adminPage.viewportSize();

      // Test mobile view
      await adminPage.setViewportSize({ width: 375, height: 667 });
      await expect(responsiveDemo).toBeVisible();

      // Test tablet view
      await adminPage.setViewportSize({ width: 768, height: 1024 });
      await expect(responsiveDemo).toBeVisible();

      // Restore original viewport
      if (originalViewport) {
        await adminPage.setViewportSize(originalViewport);
      }
    }
  });

  test('should show component code examples', async ({ adminPage }) => {
    await adminPage.goto('/frontend/design-system');
    await assertPageLoaded(adminPage);

    const codeExamples = adminPage.locator('[data-testid="code-example"]');
    const exampleCount = await codeExamples.count();

    if (exampleCount > 0) {
      const firstExample = codeExamples.first();

      // Should have code toggle
      const codeToggle = firstExample.locator('[data-testid="toggle-code"]');
      if (await codeToggle.isVisible()) {
        await codeToggle.click();

        const codeBlock = adminPage.locator('[data-testid="code-block"]');
        if (await codeBlock.isVisible()) {
          await expect(codeBlock).toBeVisible();

          // Should have copy button
          const copyButton = adminPage.locator('[data-testid="copy-code"]');
          if (await copyButton.isVisible()) {
            await expect(copyButton).toBeVisible();
          }
        }
      }
    }
  });
});
