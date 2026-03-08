/**
 * Public barrel for `@/api`.
 *
 * ```ts
 * import { api, ApiError, activitiesApi, projectsApi } from '@/api';
 * ```
 */

// Core client & errors
export { api } from './client';
export type { ApiClient, ListResult, ListOptions, ListAllOptions, MutateOptions } from './client';
export { ApiError } from './errors';

// Domain API modules
export { activitiesApi, participationsApi } from './activities';
export { organisationsApi } from './organisations';
export { projectsApi } from './projects';
export { periodsApi } from './periods';
export { brandingApi } from './branding';
export { contentApi, generativeApi } from './content';
export { mediaApi } from './media';
export { videoApi } from './video';
export { creditsApi, transactionsApi } from './credits';
export { workflowsApi } from './workflows';
export { filesApi } from './files';
