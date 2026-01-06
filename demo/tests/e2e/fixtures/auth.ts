import { test as base, expect, Page } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

/**
 * User roles for testing different permission levels
 */
export interface UserRole {
  email: string;
  password: string;
  role: 'admin' | 'member' | 'viewer';
}

/**
 * Context information for multi-tenancy testing
 */
export interface TestContext {
  organisationId?: string;
  projectId?: string;
}

/**
 * Authenticated page with context information
 */
export interface AuthenticatedPage extends Page {
  role: UserRole['role'];
  context: TestContext;
}

/**
 * Test users from seed data (module 032)
 * These should match the users created by the seed data
 */
export const TEST_USERS: Record<string, UserRole> = {
  admin: {
    email: 'admin@demo.local',
    password: 'password',
    role: 'admin',
  },
  member: {
    email: 'member@demo.local',
    password: 'password',
    role: 'member',
  },
  viewer: {
    email: 'viewer@demo.local',
    password: 'password',
    role: 'viewer',
  },
};

/**
 * Default test context using seed data
 * Organisation ID and Project ID from module 032 seed data
 */
export const DEFAULT_CONTEXT: TestContext = {
  organisationId: '1', // First organisation from seed data
  projectId: '1',      // First project from seed data
};

/**
 * Login helper function that uses session cookies from B05
 * Posts to /api/auth/login/ and captures session cookie
 */
async function loginUser(page: Page, user: UserRole, context: TestContext = DEFAULT_CONTEXT): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill login form
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);

  // Submit form and wait for redirect
  await page.click('[data-testid="login-button"]');

  // Wait for successful login - should redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });

  // Set context headers if provided (F03 context switcher)
  if (context.organisationId) {
    await page.addInitScript(({ orgId, projectId }) => {
      // Set context in localStorage (F03 persistence)
      window.localStorage.setItem('currentOrganisation', JSON.stringify({
        id: orgId,
        name: `Organisation ${orgId}`
      }));

      if (projectId) {
        window.localStorage.setItem('currentProject', JSON.stringify({
          id: projectId,
          name: `Project ${projectId}`,
          organisationId: orgId
        }));
      }
    }, {
      orgId: context.organisationId,
      projectId: context.projectId
    });
  }
}

/**
 * Setup browser context with authenticated session
 */
async function setupAuthenticatedContext(
  browserContext: BrowserContext,
  user: UserRole,
  context: TestContext = DEFAULT_CONTEXT
): Promise<void> {
  const page = await browserContext.newPage();

  try {
    await loginUser(page, user, context);

    // Verify authentication worked by checking for user info
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  } finally {
    await page.close();
  }
}

/**
 * Extended test with authenticated fixtures
 */
export const test = base.extend<{
  adminPage: AuthenticatedPage;
  memberPage: AuthenticatedPage;
  viewerPage: AuthenticatedPage;
  authenticatedPage: AuthenticatedPage;
}>({
  // Admin user fixture
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await setupAuthenticatedContext(context, TEST_USERS.admin);
    const page = await context.newPage() as AuthenticatedPage;
    page.role = 'admin';
    page.context = DEFAULT_CONTEXT;

    await use(page);

    await context.close();
  },

  // Member user fixture
  memberPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await setupAuthenticatedContext(context, TEST_USERS.member);
    const page = await context.newPage() as AuthenticatedPage;
    page.role = 'member';
    page.context = DEFAULT_CONTEXT;

    await use(page);

    await context.close();
  },

  // Viewer user fixture
  viewerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await setupAuthenticatedContext(context, TEST_USERS.viewer);
    const page = await context.newPage() as AuthenticatedPage;
    page.role = 'viewer';
    page.context = DEFAULT_CONTEXT;

    await use(page);

    await context.close();
  },

  // Generic authenticated page (uses admin by default)
  authenticatedPage: async ({ adminPage }, use) => {
    await use(adminPage);
  },
});

/**
 * Expect with authentication context
 */
export { expect } from '@playwright/test';

/**
 * Helper to assert user has appropriate permissions for actions
 */
export async function assertPermissions(page: AuthenticatedPage, action: 'create' | 'edit' | 'delete' | 'view') {
  const { role } = page;

  switch (action) {
    case 'create':
    case 'edit':
    case 'delete':
      // Only admin and member should have these permissions
      if (role === 'viewer') {
        // Should not see action buttons
        await expect(page.locator(`[data-testid="${action}-button"]`)).not.toBeVisible();
      } else {
        // Should see action buttons
        await expect(page.locator(`[data-testid="${action}-button"]`)).toBeVisible();
      }
      break;

    case 'view':
      // All roles should be able to view
      await expect(page.locator('[data-testid="content"]')).toBeVisible();
      break;
  }
}

/**
 * Helper to switch organisation context during test
 */
export async function switchOrganisation(page: AuthenticatedPage, organisationId: string) {
  await page.click('[data-testid="context-switcher"]');
  await page.click(`[data-testid="org-option-${organisationId}"]`);

  // Wait for context to update
  await page.waitForFunction(
    (orgId) => {
      const stored = window.localStorage.getItem('currentOrganisation');
      return stored && JSON.parse(stored).id === orgId;
    },
    organisationId
  );

  // Update page context
  page.context.organisationId = organisationId;
}

/**
 * Helper to switch project context during test
 */
export async function switchProject(page: AuthenticatedPage, projectId: string) {
  await page.click('[data-testid="context-switcher"]');
  await page.click(`[data-testid="project-option-${projectId}"]`);

  // Wait for context to update
  await page.waitForFunction(
    (projId) => {
      const stored = window.localStorage.getItem('currentProject');
      return stored && JSON.parse(stored).id === projId;
    },
    projectId
  );

  // Update page context
  page.context.projectId = projectId;
}
