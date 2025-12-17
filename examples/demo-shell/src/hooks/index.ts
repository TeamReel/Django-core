/**
 * Shared Hooks Barrel Export
 */

export { useQueryParams, type UsePollingOptions } from './useQueryParams';
export { usePolling } from './usePolling';

export default {
  useQueryParams: () => import('./useQueryParams').then(m => m.useQueryParams),
  usePolling: () => import('./usePolling').then(m => m.usePolling),
};
