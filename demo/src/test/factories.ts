/**
 * Mock data factories for API types.
 *
 * Each factory returns a valid default shape that tests can override:
 *
 * ```ts
 * import { buildUser, buildProject } from '@/test/factories';
 *
 * const user = buildUser({ email: 'custom@test.com' });
 * const project = buildProject({ name: 'FC Test' });
 * ```
 *
 * Factories use auto-incrementing IDs to avoid collisions across tests.
 */

export {
  nextId,
  nextUuid,
  resetFactoryCounters,
  buildUser,
  buildUserDetail,
  buildOrganisation,
  buildOrganisationDetail,
  buildProject,
  buildProjectDetail,
  buildPeriod,
  buildActivity,
} from './factoriesCore';

export {
  buildBrandProfile,
  buildMediaItem,
  buildFileAsset,
  buildVideoJob,
  buildWorkflowInstance,
  buildCreditsBalance,
  buildSport,
} from './factoriesMedia';
