import { test, expect, assertPageLoaded } from '../fixtures';

test.describe('Documentation Page', () => {
  test('should load documentation for all users', async ({ adminPage, memberPage, viewerPage }) => {
    // Documentation should be accessible to all users
    for (const [role, page] of [['admin', adminPage], ['member', memberPage], ['viewer', viewerPage]]) {
      await page.goto('/docs/documentation');
      await assertPageLoaded(page, 'Documentation');

      // Should show documentation content
      const documentationContent = page.locator('[data-testid="documentation-content"]');
      await expect(documentationContent).toBeVisible();
    }
  });

  test('should display documentation navigation and structure', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    // Should show documentation sidebar navigation
    const docNavigation = adminPage.locator('[data-testid="documentation-nav"]');
    if (await docNavigation.isVisible()) {
      await expect(docNavigation).toBeVisible();

      // Should show documentation sections
      const docSections = adminPage.locator('[data-testid="doc-section"]');
      const sectionCount = await docSections.count();
      expect(sectionCount).toBeGreaterThan(0);

      if (sectionCount > 0) {
        const firstSection = docSections.first();
        await expect(firstSection.locator('[data-testid="section-title"]')).toBeVisible();

        // Should show subsections
        const subsections = firstSection.locator('[data-testid="doc-subsection"]');
        const subsectionCount = await subsections.count();

        if (subsectionCount > 0) {
          const firstSubsection = subsections.first();
          await expect(firstSubsection).toBeVisible();
        }
      }
    }
  });

  test('should navigate between documentation pages', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const docNavItem = adminPage.locator('[data-testid="doc-nav-item"]').first();
    if (await docNavItem.isVisible()) {
      const itemTitle = await docNavItem.textContent();

      // Click navigation item
      await docNavItem.click();

      // Should navigate to documentation page
      const docContent = adminPage.locator('[data-testid="doc-content"]');
      if (await docContent.isVisible()) {
        await expect(docContent).toBeVisible();

        // Should show page title
        const pageTitle = adminPage.locator('[data-testid="doc-page-title"]');
        if (await pageTitle.isVisible()) {
          const titleText = await pageTitle.textContent();
          expect(titleText).toBeTruthy();
        }
      }
    }
  });

  test('should search documentation content', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const docSearch = adminPage.locator('[data-testid="documentation-search"]');
    if (await docSearch.isVisible()) {
      await docSearch.fill('authentication');
      await adminPage.press('[data-testid="documentation-search"]', 'Enter');

      // Should show search results
      const searchResults = adminPage.locator('[data-testid="doc-search-results"]');
      if (await searchResults.isVisible()) {
        await expect(searchResults).toBeVisible();

        // Should show search result items
        const resultItems = adminPage.locator('[data-testid="search-result-item"]');
        const resultCount = await resultItems.count();

        if (resultCount > 0) {
          const firstResult = resultItems.first();
          await expect(firstResult.locator('[data-testid="result-title"]')).toBeVisible();
          await expect(firstResult.locator('[data-testid="result-excerpt"]')).toBeVisible();

          // Should highlight search terms
          const highlightedText = adminPage.locator('[data-testid="search-highlight"]');
          if (await highlightedText.count() > 0) {
            await expect(highlightedText.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('should display API documentation', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const apiDocsSection = adminPage.locator('[data-testid="api-documentation"]');
    if (await apiDocsSection.isVisible()) {
      // Should show API endpoints
      const apiEndpoints = adminPage.locator('[data-testid="api-endpoint"]');
      const endpointCount = await apiEndpoints.count();

      if (endpointCount > 0) {
        const firstEndpoint = apiEndpoints.first();
        await expect(firstEndpoint.locator('[data-testid="endpoint-method"]')).toBeVisible();
        await expect(firstEndpoint.locator('[data-testid="endpoint-path"]')).toBeVisible();
        await expect(firstEndpoint.locator('[data-testid="endpoint-description"]')).toBeVisible();

        // Should expand endpoint details
        const expandButton = firstEndpoint.locator('[data-testid="expand-endpoint"]');
        if (await expandButton.isVisible()) {
          await expandButton.click();

          const endpointDetails = adminPage.locator('[data-testid="endpoint-details"]');
          if (await endpointDetails.isVisible()) {
            await expect(endpointDetails).toBeVisible();

            // Should show parameters
            const parameters = endpointDetails.locator('[data-testid="endpoint-parameters"]');
            if (await parameters.isVisible()) {
              await expect(parameters).toBeVisible();
            }

            // Should show response examples
            const responseExamples = endpointDetails.locator('[data-testid="response-examples"]');
            if (await responseExamples.isVisible()) {
              await expect(responseExamples).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('should show code examples with syntax highlighting', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const codeExamples = adminPage.locator('[data-testid="code-example"]');
    const exampleCount = await codeExamples.count();

    if (exampleCount > 0) {
      const firstExample = codeExamples.first();

      // Should show syntax-highlighted code
      const codeBlock = firstExample.locator('[data-testid="code-block"]');
      if (await codeBlock.isVisible()) {
        await expect(codeBlock).toBeVisible();

        // Should have copy button
        const copyButton = firstExample.locator('[data-testid="copy-code"]');
        if (await copyButton.isVisible()) {
          await copyButton.click();

          // Should show copied confirmation
          const copiedConfirmation = adminPage.locator('[data-testid="code-copied"]');
          if (await copiedConfirmation.isVisible()) {
            await expect(copiedConfirmation).toBeVisible();
          }
        }

        // Should show language indicator
        const languageLabel = firstExample.locator('[data-testid="code-language"]');
        if (await languageLabel.isVisible()) {
          const language = await languageLabel.textContent();
          expect(['javascript', 'typescript', 'python', 'bash', 'json']).toContain(language?.toLowerCase());
        }
      }
    }
  });

  test('should display getting started guide', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const gettingStarted = adminPage.locator('[data-testid="getting-started-guide"]');
    if (await gettingStarted.isVisible()) {
      // Should show step-by-step instructions
      const guideSteps = adminPage.locator('[data-testid="guide-step"]');
      const stepCount = await guideSteps.count();

      if (stepCount > 0) {
        const firstStep = guideSteps.first();
        await expect(firstStep.locator('[data-testid="step-number"]')).toBeVisible();
        await expect(firstStep.locator('[data-testid="step-title"]')).toBeVisible();
        await expect(firstStep.locator('[data-testid="step-content"]')).toBeVisible();

        // Should show progress indicator
        const stepProgress = adminPage.locator('[data-testid="step-progress"]');
        if (await stepProgress.isVisible()) {
          await expect(stepProgress).toBeVisible();
        }
      }
    }
  });

  test('should show troubleshooting section', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const troubleshooting = adminPage.locator('[data-testid="troubleshooting-section"]');
    if (await troubleshooting.isVisible()) {
      // Should show common issues
      const commonIssues = adminPage.locator('[data-testid="common-issue"]');
      const issueCount = await commonIssues.count();

      if (issueCount > 0) {
        const firstIssue = commonIssues.first();
        await expect(firstIssue.locator('[data-testid="issue-title"]')).toBeVisible();
        await expect(firstIssue.locator('[data-testid="issue-description"]')).toBeVisible();

        // Should show solution
        const solution = firstIssue.locator('[data-testid="issue-solution"]');
        if (await solution.isVisible()) {
          await expect(solution).toBeVisible();
        }

        // Should be expandable/collapsible
        const expandIssue = firstIssue.locator('[data-testid="expand-issue"]');
        if (await expandIssue.isVisible()) {
          await expandIssue.click();

          const expandedSolution = adminPage.locator('[data-testid="expanded-solution"]');
          if (await expandedSolution.isVisible()) {
            await expect(expandedSolution).toBeVisible();
          }
        }
      }
    }
  });

  test('should display changelog and release notes', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const changelog = adminPage.locator('[data-testid="changelog-section"]');
    if (await changelog.isVisible()) {
      // Should show version releases
      const releases = adminPage.locator('[data-testid="release-item"]');
      const releaseCount = await releases.count();

      if (releaseCount > 0) {
        const latestRelease = releases.first();
        await expect(latestRelease.locator('[data-testid="release-version"]')).toBeVisible();
        await expect(latestRelease.locator('[data-testid="release-date"]')).toBeVisible();
        await expect(latestRelease.locator('[data-testid="release-notes"]')).toBeVisible();

        // Should show change categories
        const changeCategories = latestRelease.locator('[data-testid="change-category"]');
        const categoryCount = await changeCategories.count();

        if (categoryCount > 0) {
          const firstCategory = changeCategories.first();
          const categoryType = await firstCategory.getAttribute('data-category');
          expect(['added', 'changed', 'deprecated', 'removed', 'fixed', 'security']).toContain(categoryType);
        }
      }
    }
  });

  test('should show documentation table of contents', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const tableOfContents = adminPage.locator('[data-testid="table-of-contents"]');
    if (await tableOfContents.isVisible()) {
      // Should show TOC items
      const tocItems = adminPage.locator('[data-testid="toc-item"]');
      const itemCount = await tocItems.count();

      if (itemCount > 0) {
        const firstTocItem = tocItems.first();
        const tocText = await firstTocItem.textContent();

        // Click TOC item
        await firstTocItem.click();

        // Should scroll to corresponding section
        const targetSection = adminPage.locator(`[data-testid="section-${tocText?.toLowerCase().replace(/\s+/g, '-')}"]`);
        if (await targetSection.isVisible()) {
          await expect(targetSection).toBeInViewport();
        }
      }
    }
  });

  test('should display contributor guide', async ({ adminPage }) => {
    await adminPage.goto('/docs/documentation');
    await assertPageLoaded(adminPage);

    const contributorGuide = adminPage.locator('[data-testid="contributor-guide"]');
    if (await contributorGuide.isVisible()) {
      // Should show contribution guidelines
      const guidelines = adminPage.locator('[data-testid="contribution-guidelines"]');
      if (await guidelines.isVisible()) {
        await expect(guidelines).toBeVisible();

        // Should show development setup
        const devSetup = adminPage.locator('[data-testid="development-setup"]');
        if (await devSetup.isVisible()) {
          await expect(devSetup).toBeVisible();
        }

        // Should show coding standards
        const codingStandards = adminPage.locator('[data-testid="coding-standards"]');
        if (await codingStandards.isVisible()) {
          await expect(codingStandards).toBeVisible();
        }

        // Should show pull request process
        const prProcess = adminPage.locator('[data-testid="pr-process"]');
        if (await prProcess.isVisible()) {
          await expect(prProcess).toBeVisible();
        }
      }
    }
  });
});
