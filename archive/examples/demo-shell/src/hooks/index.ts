/**
 * Shared Hooks Barrel Export
 */

export { useQueryParams } from './useQueryParams';
export { usePolling, type UsePollingOptions, type UsePollingResult } from './usePolling';

export default {
  useQueryParams: () => import('./useQueryParams').then(m => m.useQueryParams),
  usePolling: () => import('./usePolling').then(m => m.usePolling),
};
