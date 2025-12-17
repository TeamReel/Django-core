/**
 * E2E Test Fixtures for Demo Shell
 *
 * Provides authenticated user fixtures and common test helpers
 * for comprehensive E2E testing across all demo pages.
 */

export {
  test,
  expect,
  TEST_USERS,
  DEFAULT_CONTEXT,
  assertPermissions,
  switchOrganisation,
  switchProject,
} from './auth';

export {
  assertPageLoaded,
  assertNavigationStructure,
  assertSeedDataCounts,
  assertPollingUpdates,
  assertThemeToggle,
  assertChartLoads,
  assertFormValidation,
  assertSearchFiltering,
  assertRoleBasedUI,
  waitForApiCall,
  assertPerformance,
} from './helpers';

export type {
  UserRole,
  TestContext,
  AuthenticatedPage,
} from './auth';
